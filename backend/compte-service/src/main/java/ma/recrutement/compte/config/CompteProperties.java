package ma.recrutement.compte.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Réglages de compte-service : accès à l'Admin API Keycloak et règles de l'inscription (DAT, section 7).
 */
@ConfigurationProperties(prefix = "app")
public record CompteProperties(String frontUrl, Keycloak keycloak, Inscription inscription) {

    /** Client confidentiel {@code compte-service} (Client Credentials), autorisé à gérer les utilisateurs. */
    public record Keycloak(String url, String realm, String clientId, String clientSecret, String clientFront) {
    }

    /**
     * @param secret          clé HMAC des codes SMS stockés dans Redis
     * @param dureeCode       validité d'un code SMS
     * @param essaisMax       essais par code
     * @param delaiRenvoi     délai entre deux envois de code (ou d'e-mail)
     * @param envoisParHeure  codes envoyés au même numéro en une heure
     * @param dureeInscription durée de vie d'une inscription non terminée
     * @param dureeLienEmail  validité du lien d'activation
     */
    public record Inscription(String secret, Duration dureeCode, int essaisMax, Duration delaiRenvoi,
                              int envoisParHeure, Duration dureeInscription, Duration dureeLienEmail) {
    }
}
