package ma.recrutement.compte.inscription;

import java.time.Duration;
import java.time.Instant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.compte.config.CompteProperties;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Supprime les comptes Keycloak d'inscriptions jamais terminées (code SMS non validé) après 48 h.
 * Un verrou Redis évite que plusieurs instances fassent le ménage en même temps.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NettoyageInscriptions {

    private final ComptesKeycloak comptes;
    private final InscriptionStore store;
    private final CompteProperties props;

    @Scheduled(cron = "${app.inscription.nettoyage-cron:0 15 * * * *}")
    public void supprimerAbandonnees() {
        if (!store.verrouiller("nettoyage-inscriptions", Duration.ofMinutes(10))) {
            return;
        }
        Instant limite = Instant.now().minus(props.inscription().dureeInscription());
        int n = 0;
        for (UserRepresentation u : comptes.inscriptionsAbandonnees(limite)) {
            comptes.supprimer(u.getId());
            n++;
        }
        if (n > 0) {
            log.info("{} inscription(s) non terminée(s) supprimée(s) de Keycloak", n);
        }
    }
}
