package ma.recrutement.common.events;

/**
 * Publié quand le numéro est vérifié et le compte Keycloak activé. {@code type} vaut CANDIDAT
 * (profil vide à créer) ou ENTREPRISE (contact à rattacher par le recruteur).
 */
public record CompteCreeEvent(
        String keycloakUserId,
        String type,
        String email,
        String prenom,
        String nom,
        String telephone,
        String raisonSociale) {
}
