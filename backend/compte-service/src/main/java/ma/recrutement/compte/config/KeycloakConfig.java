package ma.recrutement.compte.config;

import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.RealmResource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Client de l'Admin API Keycloak, authentifié par le compte de service du client {@code compte-service}. */
@Configuration
public class KeycloakConfig {

    @Bean(destroyMethod = "close")
    public Keycloak keycloakAdmin(CompteProperties props) {
        CompteProperties.Keycloak kc = props.keycloak();
        return KeycloakBuilder.builder()
                .serverUrl(kc.url())
                .realm(kc.realm())
                .grantType(OAuth2Constants.CLIENT_CREDENTIALS)
                .clientId(kc.clientId())
                .clientSecret(kc.clientSecret())
                .build();
    }

    @Bean
    public RealmResource realmRecrutement(Keycloak keycloak, CompteProperties props) {
        return keycloak.realm(props.keycloak().realm());
    }
}
