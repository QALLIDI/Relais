package ma.recrutement.compte.equipe;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.compte.config.CompteProperties;
import ma.recrutement.compte.inscription.ComptesKeycloak;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Équipe d'une entreprise : les comptes Keycloak qui portent le même attribut {@code entrepriseId}.
 * Un membre invité reçoit l'e-mail natif de Keycloak (« actions requises ») pour choisir son mot
 * de passe et confirmer son adresse ; il est rattaché d'emblée, sans validation du cabinet.
 * <p>
 * Deux rôles : membre (rôle ENTREPRISE) et administrateur (ENTREPRISE + ENTREPRISE_ADMIN). Seuls les
 * administrateurs gèrent l'équipe ; une entreprise garde toujours au moins un administrateur.
 * Un changement de rôle prend effet au prochain renouvellement du jeton de l'intéressé.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EquipeService {

    /** Validité du lien d'invitation : 7 jours. */
    private static final int DUREE_LIEN = 7 * 24 * 3600;

    private final RealmResource realm;
    private final CompteProperties props;
    private final ComptesKeycloak comptes;

    public record Membre(String id, String prenom, String nom, String email, String fonction, boolean actif, boolean moi, boolean admin) {
    }

    public record Invitation(String email, String prenom, String nom, String fonction, boolean admin) {
    }

    public List<Membre> membres() {
        String entreprise = monEntreprise();
        Set<String> admins = idsAdministrateurs();
        return comptesDe(entreprise).stream()
                .map(u -> membre(u, admins))
                .sorted(Comparator.comparing(Membre::moi).reversed()
                        .thenComparing(Comparator.comparing(Membre::admin).reversed())
                        .thenComparing(m -> m.email() == null ? "" : m.email()))
                .toList();
    }

    public Membre inviter(Invitation i) {
        String entreprise = monEntrepriseEnAdmin();
        String email = i.email().strip().toLowerCase();
        if (comptes.parEmail(email).isPresent()) {
            throw new BusinessException("Un compte existe déjà avec cette adresse e-mail.");
        }
        UserRepresentation u = new UserRepresentation();
        u.setUsername(email);
        u.setEmail(email);
        u.setFirstName(vide(i.prenom()));
        u.setLastName(vide(i.nom()));
        u.setEnabled(true);
        u.setEmailVerified(false);
        Map<String, List<String>> attributs = new HashMap<>();
        attributs.put("entrepriseId", List.of(entreprise));
        attributs.put("typeCompte", List.of(Roles.ENTREPRISE));
        attributs.put("invitePar", List.of(CurrentUser.id()));
        if (i.fonction() != null && !i.fonction().isBlank()) {
            attributs.put("fonction", List.of(i.fonction().strip()));
        }
        u.setAttributes(attributs);
        String id;
        try (Response r = realm.users().create(u)) {
            if (r.getStatus() == 409) {
                throw new BusinessException("Un compte existe déjà avec cette adresse e-mail.");
            }
            id = CreatedResponseUtil.getCreatedId(r);
        }
        try {
            UserResource user = realm.users().get(id);
            List<RoleRepresentation> roles = new java.util.ArrayList<>(List.of(role(Roles.ENTREPRISE)));
            if (i.admin()) {
                roles.add(role(Roles.ENTREPRISE_ADMIN));
            }
            user.roles().realmLevel().add(roles);
            user.executeActionsEmail(props.keycloak().clientFront(), props.frontUrl() + "/entreprise", DUREE_LIEN,
                    List.of("UPDATE_PASSWORD", "VERIFY_EMAIL"));
        } catch (RuntimeException e) {
            comptes.supprimer(id);
            throw e;
        }
        log.info("Invitation de {} dans l'entreprise {}{}", email, entreprise, i.admin() ? " (administrateur)" : "");
        return membre(realm.users().get(id).toRepresentation(), idsAdministrateurs());
    }

    /** Nomme ou retire un administrateur. Le dernier administrateur de l'entreprise ne peut pas être rétrogradé. */
    public Membre changerRole(String userId, boolean admin) {
        String entreprise = monEntrepriseEnAdmin();
        UserRepresentation u = deMonEntreprise(userId);
        Set<String> admins = idsAdministrateurs();
        boolean estAdmin = admins.contains(userId);
        if (estAdmin == admin) {
            return membre(u, admins);
        }
        UserResource user = realm.users().get(userId);
        if (admin) {
            user.roles().realmLevel().add(List.of(role(Roles.ENTREPRISE_ADMIN)));
            admins.add(userId);
        } else {
            if (administrateursDe(entreprise, admins) <= 1) {
                throw new BusinessException("Votre entreprise doit garder au moins un administrateur. Nommez-en un autre avant.");
            }
            user.roles().realmLevel().remove(List.of(role(Roles.ENTREPRISE_ADMIN)));
            admins.remove(userId);
        }
        log.info("Rôle de {} dans l'entreprise {} : {}", userId, entreprise, admin ? "administrateur" : "membre");
        return membre(u, admins);
    }

    /**
     * Donne le rôle d'administrateur à ce compte si son entreprise n'en a encore aucun
     * (premier compte rattaché, ou entreprise créée avant l'arrivée des rôles).
     *
     * @return vrai si le compte a été nommé administrateur
     */
    public boolean nommerSiAucunAdministrateur(String userId, String entreprise) {
        if (administrateursDe(entreprise, idsAdministrateurs()) > 0) {
            return false;
        }
        realm.users().get(userId).roles().realmLevel().add(List.of(role(Roles.ENTREPRISE_ADMIN)));
        log.info("Compte {} nommé administrateur de l'entreprise {} (aucun administrateur)", userId, entreprise);
        return true;
    }

    /** Comptes rattachés à une entreprise. */
    public List<UserRepresentation> comptesDe(String entreprise) {
        return realm.users().searchByAttributes(0, 200, null, false, true, "entrepriseId:" + entreprise).stream()
                .filter(u -> entreprise.equals(ComptesKeycloak.attribut(u, "entrepriseId")))
                .toList();
    }

    /** Identifiants de tous les comptes qui ont le rôle ENTREPRISE_ADMIN, toutes entreprises confondues. */
    public Set<String> idsAdministrateurs() {
        return realm.roles().get(Roles.ENTREPRISE_ADMIN).getUserMembers(0, 5000).stream()
                .map(UserRepresentation::getId)
                .collect(Collectors.toCollection(java.util.HashSet::new));
    }

    private long administrateursDe(String entreprise, Set<String> admins) {
        return comptesDe(entreprise).stream().filter(u -> admins.contains(u.getId())).count();
    }

    private RoleRepresentation role(String nom) {
        return realm.roles().get(nom).toRepresentation();
    }

    /** Renvoie l'e-mail d'invitation à un membre qui ne l'a pas encore utilisé. */
    public void relancer(String userId) {
        monEntrepriseEnAdmin();
        UserRepresentation u = deMonEntreprise(userId);
        if (Boolean.TRUE.equals(u.isEmailVerified())) {
            throw new BusinessException("Ce membre a déjà activé son compte.");
        }
        realm.users().get(userId).executeActionsEmail(props.keycloak().clientFront(), props.frontUrl() + "/entreprise",
                DUREE_LIEN, List.of("UPDATE_PASSWORD", "VERIFY_EMAIL"));
    }

    /** Retire un membre de l'équipe : son compte de connexion est supprimé. */
    public void retirer(String userId) {
        String entreprise = monEntrepriseEnAdmin();
        if (userId.equals(CurrentUser.id())) {
            throw new BusinessException("Vous ne pouvez pas vous retirer vous-même.");
        }
        deMonEntreprise(userId);
        Set<String> admins = idsAdministrateurs();
        if (admins.contains(userId) && administrateursDe(entreprise, admins) <= 1) {
            throw new BusinessException("Votre entreprise doit garder au moins un administrateur.");
        }
        comptes.supprimer(userId);
    }

    private UserRepresentation deMonEntreprise(String userId) {
        UserRepresentation u = comptes.trouver(userId).orElseThrow(() -> new NotFoundException("Membre introuvable"));
        if (!monEntreprise().equals(ComptesKeycloak.attribut(u, "entrepriseId"))) {
            throw new AccessDeniedException("Ce compte n'appartient pas à votre entreprise");
        }
        return u;
    }

    private Membre membre(UserRepresentation u, Set<String> admins) {
        return new Membre(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), ComptesKeycloak.attribut(u, "fonction"),
                Boolean.TRUE.equals(u.isEmailVerified()), u.getId().equals(CurrentUser.id()), admins.contains(u.getId()));
    }

    /** Entreprise de l'utilisateur, qui doit en être administrateur. */
    private static String monEntrepriseEnAdmin() {
        String id = monEntreprise();
        if (!CurrentUser.hasRole(Roles.ENTREPRISE_ADMIN)) {
            throw new AccessDeniedException("Réservé aux administrateurs de votre entreprise");
        }
        return id;
    }

    private static String monEntreprise() {
        if (!CurrentUser.hasRole(Roles.ENTREPRISE)) {
            throw new AccessDeniedException("Réservé aux comptes entreprise");
        }
        String id = CurrentUser.jwt().getClaimAsString("entrepriseId");
        if (id == null || id.isBlank()) {
            throw new AccessDeniedException("Compte pas encore rattaché à une entreprise");
        }
        return id;
    }

    private static String vide(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
