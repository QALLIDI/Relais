package ma.recrutement.selection.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.selection.service.SelectionService;
import ma.recrutement.selection.web.Dtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PipelineController {

    private final SelectionService service;

    @GetMapping("/api/pipeline/{missionId}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public PipelineDto pipeline(@PathVariable UUID missionId) {
        return service.pipeline(missionId);
    }

    @GetMapping("/api/pipeline/{missionId}/suggestions")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<SuggestionDto> suggestions(@PathVariable UUID missionId) {
        return service.suggestions(missionId);
    }

    @PostMapping("/api/candidatures")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public CandidatureDto ajouter(@Valid @RequestBody AjoutRequest req) {
        return service.ajouter(req.missionId(), req.candidatId());
    }

    @GetMapping("/api/candidatures")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<CandidatureDto> lister(@RequestParam(required = false) UUID candidatId) {
        return candidatId == null ? service.enCours() : service.parCandidat(candidatId);
    }

    @PatchMapping("/api/candidatures/{id}/etape")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public CandidatureDto changerEtape(@PathVariable UUID id, @Valid @RequestBody EtapeRequest req) {
        return service.changerEtape(id, req);
    }

    @PutMapping("/api/candidatures/{id}/evaluation")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public CandidatureDto evaluer(@PathVariable UUID id, @Valid @RequestBody EvaluationRequest req) {
        return service.evaluer(id, req);
    }

    @PostMapping("/api/shortlists")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<CandidatureDto> envoyerShortlist(@Valid @RequestBody ShortlistRequest req) {
        return service.envoyerShortlist(req);
    }

    @GetMapping("/api/selection/stats")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public SelectionStats stats() {
        return service.stats();
    }

    @GetMapping("/api/selection/missions")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public List<MissionResumeDto> resumeParMission() {
        return service.resumeParMission();
    }
}
