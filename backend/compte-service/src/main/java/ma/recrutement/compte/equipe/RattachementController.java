package ma.recrutement.compte.equipe;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.NotFoundException;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

/**
 * Rattachement d'un compte entreprise inscrit en ligne : le recruteur renseigne l'attribut
 * {@code entrepriseId} du compte Keycloak (repris dans le jeton). L'utilisateur y a accès
 * à sa prochaine connexion.
 */
@RestController
@RequestMapping("/api/comptes")
@RequiredArgsConstructor
@Slf4j
public class RattachementController {

    private final RealmResource realm;

    public record RattachementRequest(@NotNull UUID entrepriseId) {
    }

    @PutMapping("/{userId}/entreprise")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rattacher(@PathVariable String userId, @Valid @RequestBody RattachementRequest req) {
        if (!CurrentUser.hasRole(Roles.RECRUTEUR)) {
            throw new AccessDeniedException("Réservé au recruteur");
        }
        UserResource user = realm.users().get(userId);
        UserRepresentation u;
        try {
            u = user.toRepresentation();
        } catch (jakarta.ws.rs.NotFoundException e) {
            throw new NotFoundException("Compte introuvable");
        }
        Map<String, List<String>> attrs = new HashMap<>(u.getAttributes() == null ? Map.of() : u.getAttributes());
        attrs.put("entrepriseId", List.of(req.entrepriseId().toString()));
        u.setAttributes(attrs);
        user.update(u);
        boolean aLeRole = user.roles().realmLevel().listEffective().stream().map(RoleRepresentation::getName)
                .anyMatch(Roles.ENTREPRISE::equals);
        if (!aLeRole) {
            user.roles().realmLevel().add(List.of(realm.roles().get(Roles.ENTREPRISE).toRepresentation()));
        }
        log.info("Compte {} rattaché à l'entreprise {}", userId, req.entrepriseId());
    }
}
