package ma.recrutement.selection.client;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "entreprise-service", url = "${app.services.entreprise}")
public interface EntrepriseClient {

    @GetMapping("/api/missions/{id}")
    MissionView mission(@PathVariable("id") UUID id);

    record MissionView(UUID id, UUID entrepriseId, String entrepriseNom, String contactEmail,
                       BigDecimal tauxHonoraires, String intitule, String ville, Integer experienceMin,
                       BigDecimal salaireMin, BigDecimal salaireMax, String statut,
                       List<String> competencesRequises, List<String> competencesSouhaitees) {
    }
}
