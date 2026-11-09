package ma.recrutement.compte.equipe;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Équipe d'une entreprise : les comptes Keycloak qui portent le même attribut {@code entrepriseId}.
 * Un membre invité reçoit l'e-mail natif de Keycloak (« actions requises ») pour choisir son mot
 * de passe et confirmer son adresse ; il est rattaché d'emblée, sans validation du cabinet.
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

    public record Membre(String id, String prenom, String nom, String email, String fonction, boolean actif, boolean moi) {
    }

    public record Invitation(String email, String prenom, String nom, String fonction) {
    }

    public List<Membre> membres() {
        String entreprise = monEntreprise();
        return realm.users().searchByAttributes(0, 200, null, false, true, "entrepriseId:" + entreprise).stream()
                .filter(u -> entreprise.equals(ComptesKeycloak.attribut(u, "entrepriseId")))
                .map(this::membre)
                .sorted(Comparator.comparing(Membre::moi).reversed().thenComparing(m -> m.email() == null ? "" : m.email()))
                .toList();
    }

    public Membre inviter(Invitation i) {
        String entreprise = monEntreprise();
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
            user.roles().realmLevel().add(List.of(realm.roles().get(Roles.ENTREPRISE).toRepresentation()));
            user.executeActionsEmail(props.keycloak().clientFront(), props.frontUrl() + "/entreprise", DUREE_LIEN,
                    List.of("UPDATE_PASSWORD", "VERIFY_EMAIL"));
        } catch (RuntimeException e) {
            comptes.supprimer(id);
            throw e;
        }
        log.info("Invitation de {} dans l'entreprise {}", email, entreprise);
        return membre(realm.users().get(id).toRepresentation());
    }

    /** Renvoie l'e-mail d'invitation à un membre qui ne l'a pas encore utilisé. */
    public void relancer(String userId) {
        UserRepresentation u = deMonEntreprise(userId);
        if (Boolean.TRUE.equals(u.isEmailVerified())) {
            throw new BusinessException("Ce membre a déjà activé son compte.");
        }
        realm.users().get(userId).executeActionsEmail(props.keycloak().clientFront(), props.frontUrl() + "/entreprise",
                DUREE_LIEN, List.of("UPDATE_PASSWORD", "VERIFY_EMAIL"));
    }

    /** Retire un membre de l'équipe : son compte de connexion est supprimé. */
    public void retirer(String userId) {
        if (userId.equals(CurrentUser.id())) {
            throw new BusinessException("Vous ne pouvez pas vous retirer vous-même.");
        }
        deMonEntreprise(userId);
        comptes.supprimer(userId);
    }

    private UserRepresentation deMonEntreprise(String userId) {
        UserRepresentation u = comptes.trouver(userId).orElseThrow(() -> new NotFoundException("Membre introuvable"));
        if (!monEntreprise().equals(ComptesKeycloak.attribut(u, "entrepriseId"))) {
            throw new AccessDeniedException("Ce compte n'appartient pas à votre entreprise");
        }
        return u;
    }

    private Membre membre(UserRepresentation u) {
        return new Membre(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), ComptesKeycloak.attribut(u, "fonction"),
                Boolean.TRUE.equals(u.isEmailVerified()), u.getId().equals(CurrentUser.id()));
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
