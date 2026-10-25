package ma.recrutement.compte.inscription;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Inscription en cours, gardée dans Redis (hash {@code inscription:<id>}) jusqu'à 48 h.
 * Le mot de passe n'y figure jamais : il part directement dans Keycloak à l'étape 2.
 *
 * @param etape 2 = téléphone et mot de passe à saisir, 3 = code SMS à saisir, 4 = e-mail d'activation envoyé
 */
public record Inscription(
        UUID id,
        TypeCompte type,
        String email,
        String prenom,
        String nom,
        String raisonSociale,
        String telephone,
        String userId,
        int etape) {

    public Inscription avecCompte(String telephone, String userId) {
        return new Inscription(id, type, email, prenom, nom, raisonSociale, telephone, userId, 3);
    }

    public Inscription aEtape(int etape) {
        return new Inscription(id, type, email, prenom, nom, raisonSociale, telephone, userId, etape);
    }

    Map<String, String> versHash() {
        Map<String, String> h = new HashMap<>();
        h.put("type", type.name());
        h.put("email", email);
        h.put("prenom", prenom);
        h.put("nom", nom);
        h.put("etape", String.valueOf(etape));
        if (raisonSociale != null) h.put("raisonSociale", raisonSociale);
        if (telephone != null) h.put("telephone", telephone);
        if (userId != null) h.put("userId", userId);
        return h;
    }

    static Inscription depuisHash(UUID id, Map<Object, Object> h) {
        return new Inscription(id,
                TypeCompte.valueOf((String) h.get("type")),
                (String) h.get("email"),
                (String) h.get("prenom"),
                (String) h.get("nom"),
                (String) h.get("raisonSociale"),
                (String) h.get("telephone"),
                (String) h.get("userId"),
                Integer.parseInt((String) h.get("etape")));
    }
}
