package ma.recrutement.agenda.client;

import java.util.UUID;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/** Lecture de la candidature (et de sa mission) dans selection-service, avec le jeton de l'utilisateur. */
@FeignClient(name = "selection-service", url = "${app.services.selection}")
public interface SelectionClient {

    /** Route interne, non exposée par la gateway : elle renvoie les coordonnées du candidat. */
    @GetMapping("/internal/candidatures/{id}/contexte-reunion")
    ContexteReunion contexte(@PathVariable("id") UUID candidatureId);

    record ContexteReunion(UUID candidatureId, UUID missionId, String missionIntitule, UUID entrepriseId,
                           String entrepriseNom, String contactEmail, UUID candidatId, String candidatNom,
                           String candidatEmail, String etape) {
    }
}
