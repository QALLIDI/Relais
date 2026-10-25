package ma.recrutement.agenda.client;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Propage le jeton Keycloak de l'utilisateur dans les appels vers selection-service :
 * celui-ci applique ainsi ses propres droits (un client ne lit que ses candidatures).
 */
@Configuration
public class FeignAuthConfig {

    @Bean
    public RequestInterceptor bearerTokenInterceptor() {
        return template -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwt) {
                template.header("Authorization", "Bearer " + jwt.getToken().getTokenValue());
            }
        };
    }
}
