package ma.recrutement.common.security;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Accès pratique à l'utilisateur Keycloak de la requête en cours.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Jwt jwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken token) {
            return token.getToken();
        }
        throw new IllegalStateException("Aucun utilisateur authentifié");
    }

    public static String id() {
        return jwt().getSubject();
    }

    public static String email() {
        return jwt().getClaimAsString("email");
    }

    public static String nom() {
        String name = jwt().getClaimAsString("name");
        return name != null ? name : jwt().getClaimAsString("preferred_username");
    }

    public static boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    /** Identifiant de l'entreprise rattachée au compte (claim ajouté par un mapper Keycloak). */
    public static UUID entrepriseId() {
        String value = jwt().getClaimAsString("entrepriseId");
        if (value == null || value.isBlank()) {
            throw new org.springframework.security.access.AccessDeniedException("Compte non rattaché à une entreprise");
        }
        return UUID.fromString(value);
    }

    /** Valeur brute de l'en-tête Authorization, pour la propager dans les appels Feign. */
    public static String bearer() {
        return "Bearer " + jwt().getTokenValue();
    }
}
