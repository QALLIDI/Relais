package ma.recrutement.compte.equipe;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.security.Roles;
import ma.recrutement.compte.inscription.ComptesKeycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Mise à niveau des environnements existants au démarrage : nomme administrateur le plus ancien compte
 * (adresse confirmée en priorité) de chaque entreprise qui n'en a aucun. Sans effet une fois tout en place ;
 * un Keycloak injoignable ne bloque pas le démarrage. Le rôle ENTREPRISE_ADMIN lui-même vient du realm
 * (realm-recrutement.json, ou appliquer-inscription.sh pour un realm déjà importé).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdministrateursParDefaut {

    private final RealmResource realm;
    private final EquipeService equipe;

    @EventListener(ApplicationReadyEvent.class)
    public void verifier() {
        try {
            if (realm.roles().list().stream().noneMatch(r -> Roles.ENTREPRISE_ADMIN.equals(r.getName()))) {
                log.warn("Rôle {} absent du realm : lancez infra/keycloak/appliquer-inscription.sh", Roles.ENTREPRISE_ADMIN);
                return;
            }
            Set<String> admins = equipe.idsAdministrateurs();
            Map<String, List<UserRepresentation>> parEntreprise = new LinkedHashMap<>();
            realm.roles().get(Roles.ENTREPRISE).getUserMembers(0, 5000).forEach(u -> {
                String entreprise = ComptesKeycloak.attribut(u, "entrepriseId");
                if (entreprise != null && !entreprise.isBlank()) {
                    parEntreprise.computeIfAbsent(entreprise, k -> new java.util.ArrayList<>()).add(u);
                }
            });
            parEntreprise.forEach((entreprise, comptes) -> {
                if (comptes.stream().noneMatch(u -> admins.contains(u.getId()))) {
                    comptes.stream()
                            .min(Comparator.comparing((UserRepresentation u) -> !Boolean.TRUE.equals(u.isEmailVerified()))
                                    .thenComparing(u -> u.getCreatedTimestamp() == null ? Long.MAX_VALUE : u.getCreatedTimestamp()))
                            .ifPresent(u -> equipe.nommerSiAucunAdministrateur(u.getId(), entreprise));
                }
            });
        } catch (RuntimeException e) {
            log.warn("Vérification des administrateurs d'entreprise impossible au démarrage : {}", e.getMessage());
        }
    }
}
