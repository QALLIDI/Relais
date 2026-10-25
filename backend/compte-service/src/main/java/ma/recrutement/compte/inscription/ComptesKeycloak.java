package ma.recrutement.compte.inscription;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.compte.config.CompteProperties;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Comptes Keycloak gérés par l'Admin API. Un compte d'inscription porte les attributs
 * {@code telephone}, {@code typeCompte} et {@code inscription} (EN_COURS tant que le code SMS
 * n'est pas validé, TERMINEE ensuite).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ComptesKeycloak {

    static final String EN_COURS = "EN_COURS";
    static final String TERMINEE = "TERMINEE";

    private final RealmResource realm;
    private final CompteProperties props;

    public Optional<UserRepresentation> parEmail(String email) {
        return realm.users().search(email, true).stream().findFirst();
    }

    /** Inscription abandonnée : compte désactivé dont le code SMS n'a jamais été validé. */
    static boolean enCours(UserRepresentation u) {
        return !Boolean.TRUE.equals(u.isEnabled()) && EN_COURS.equals(attribut(u, "inscription"));
    }

    /** Comptes activés qui utilisent déjà ce numéro (hors {@code saufUserId}). */
    public boolean telephoneDejaUtilise(String e164, String saufUserId) {
        // La recherche porte sur les chiffres : un « + » dans la requête serait lu comme un espace.
        List<UserRepresentation> trouves = realm.users()
                .searchByAttributes(0, 20, true, false, false, "telephone:" + e164.substring(1));
        return trouves.stream()
                .filter(u -> !u.getId().equals(saufUserId))
                .anyMatch(u -> e164.equals(attribut(u, "telephone")));
    }

    /** Crée le compte désactivé, avec son rôle de realm et son mot de passe. */
    public String creer(Inscription i, String telephone, String motDePasse) {
        UserRepresentation u = new UserRepresentation();
        u.setUsername(i.email());
        u.setEmail(i.email());
        u.setFirstName(i.prenom());
        u.setLastName(i.nom());
        u.setEnabled(false);
        u.setEmailVerified(false);
        u.setAttributes(attributs(i, telephone, EN_COURS));
        String id;
        try (Response r = realm.users().create(u)) {
            if (r.getStatus() == 409) {
                throw new InscriptionException(HttpStatus.CONFLICT, "Un compte existe déjà avec cette adresse e-mail.");
            }
            id = CreatedResponseUtil.getCreatedId(r);
        }
        try {
            UserResource user = realm.users().get(id);
            user.roles().realmLevel().add(List.of(realm.roles().get(i.type().name()).toRepresentation()));
            definirMotDePasse(user, motDePasse);
        } catch (RuntimeException e) {
            supprimer(id);
            throw e;
        }
        return id;
    }

    /** Retour à l'étape 2 (« Modifier le numéro ») : nouveau numéro et nouveau mot de passe. */
    public void modifier(String userId, Inscription i, String telephone, String motDePasse) {
        UserResource user = realm.users().get(userId);
        UserRepresentation u = user.toRepresentation();
        u.setAttributes(attributs(i, telephone, EN_COURS));
        user.update(u);
        definirMotDePasse(user, motDePasse);
    }

    /** Code SMS validé : le compte est activé et doit encore confirmer son e-mail. */
    public void activer(String userId) {
        UserResource user = realm.users().get(userId);
        UserRepresentation u = user.toRepresentation();
        u.setEnabled(true);
        u.setRequiredActions(List.of("VERIFY_EMAIL"));
        Map<String, List<String>> attrs = new HashMap<>(u.getAttributes() == null ? Map.of() : u.getAttributes());
        attrs.put("inscription", List.of(TERMINEE));
        u.setAttributes(attrs);
        user.update(u);
    }

    /** E-mail d'activation natif de Keycloak (action « Vérifier l'e-mail »), lien valable 24 h. */
    public void envoyerEmailActivation(String userId, String redirection) {
        int duree = (int) props.inscription().dureeLienEmail().toSeconds();
        realm.users().get(userId).sendVerifyEmail(props.keycloak().clientFront(), redirection, duree);
    }

    public Optional<UserRepresentation> trouver(String userId) {
        try {
            return Optional.of(realm.users().get(userId).toRepresentation());
        } catch (jakarta.ws.rs.NotFoundException e) {
            return Optional.empty();
        }
    }

    public void supprimer(String userId) {
        try (Response r = realm.users().delete(userId)) {
            log.info("Compte Keycloak {} supprimé ({})", userId, r.getStatus());
        }
    }

    /** Inscriptions non terminées créées avant {@code avant}. */
    public List<UserRepresentation> inscriptionsAbandonnees(Instant avant) {
        List<UserRepresentation> resultat = new ArrayList<>();
        for (UserRepresentation u : realm.users().searchByAttributes(0, 500, false, true, false, "inscription:" + EN_COURS)) {
            if (enCours(u) && u.getCreatedTimestamp() != null && u.getCreatedTimestamp() < avant.toEpochMilli()) {
                resultat.add(u);
            }
        }
        return resultat;
    }

    private void definirMotDePasse(UserResource user, String motDePasse) {
        CredentialRepresentation c = new CredentialRepresentation();
        c.setType(CredentialRepresentation.PASSWORD);
        c.setValue(motDePasse);
        c.setTemporary(false);
        try {
            user.resetPassword(c);
        } catch (WebApplicationException e) {
            if (e.getResponse().getStatus() == 400) {
                throw new InscriptionException(HttpStatus.BAD_REQUEST,
                        "Mot de passe refusé : 8 caractères minimum, avec une majuscule ou un chiffre et un caractère spécial.");
            }
            throw e;
        }
    }

    private static Map<String, List<String>> attributs(Inscription i, String telephone, String etat) {
        Map<String, List<String>> a = new HashMap<>();
        a.put("telephone", List.of(telephone));
        a.put("typeCompte", List.of(i.type().name()));
        a.put("inscription", List.of(etat));
        if (i.raisonSociale() != null) {
            a.put("raisonSociale", List.of(i.raisonSociale()));
        }
        return a;
    }

    public static String attribut(UserRepresentation u, String nom) {
        if (u.getAttributes() == null) {
            return null;
        }
        List<String> v = u.getAttributes().get(nom);
        return v == null || v.isEmpty() ? null : v.get(0);
    }
}
