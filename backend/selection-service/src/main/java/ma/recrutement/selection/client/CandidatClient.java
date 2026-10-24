package ma.recrutement.selection.client;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "candidat-service", url = "${app.services.candidat}")
public interface CandidatClient {

    /** Tout le vivier actif (recherche sans filtre), pour les suggestions de matching. */
    @GetMapping("/api/candidats")
    List<CandidatView> vivier();

    @GetMapping("/api/candidats/resumes")
    List<CandidatView> resumes(@RequestParam("ids") List<UUID> ids);

    record CandidatView(UUID id, String nomComplet, String titre, int anneesExperience, String niveau,
                        String ville, String secteur, String disponibilite, String disponibiliteLibelle,
                        BigDecimal pretentionSalaire, List<String> competences, String email) {
    }
}
