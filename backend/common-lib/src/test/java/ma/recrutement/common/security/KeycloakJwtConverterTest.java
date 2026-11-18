package ma.recrutement.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/** Les rôles du realm Keycloak deviennent les autorités Spring sur lesquelles reposent tous les contrôles d'accès. */
class KeycloakJwtConverterTest {

    private static Jwt jeton(Map<String, Object> claims) {
        Jwt.Builder b = Jwt.withTokenValue("jeton").header("alg", "none").claim("preferred_username", "samir");
        claims.forEach(b::claim);
        return b.build();
    }

    private static List<String> roles(Jwt jwt) {
        return KeycloakJwtConverter.extractAuthorities(jwt).stream().map(GrantedAuthority::getAuthority).toList();
    }

    @Test
    void rolesDuRealmEnAutoritesSpring() {
        Jwt jwt = jeton(Map.of("realm_access", Map.of("roles", List.of("ENTREPRISE", "ENTREPRISE_ADMIN"))));

        assertThat(roles(jwt)).containsExactly("ROLE_ENTREPRISE", "ROLE_ENTREPRISE_ADMIN");
    }

    @Test
    void sansRolesAucuneAutorite() {
        assertThat(roles(jeton(Map.of("autre", "x")))).isEmpty();
        assertThat(roles(jeton(Map.of("realm_access", Map.of("roles", "RECRUTEUR"))))).isEmpty();
    }

    @Test
    void lesRolesDUnClientNeDonnentRienAuNiveauDuRealm() {
        Jwt jwt = jeton(Map.of("resource_access", Map.of("frontend", Map.of("roles", List.of("RECRUTEUR")))));

        assertThat(roles(jwt)).isEmpty();
    }

    @Test
    void leNomDeLAuthentificationEstLeNomDUtilisateur() {
        Jwt jwt = jeton(Map.of("realm_access", Map.of("roles", List.of("CANDIDAT"))));

        assertThat(new KeycloakJwtConverter().convert(jwt).getName()).isEqualTo("samir");
    }
}
