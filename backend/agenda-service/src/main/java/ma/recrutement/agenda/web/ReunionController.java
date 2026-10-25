package ma.recrutement.agenda.web;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.agenda.service.ReunionService;
import ma.recrutement.agenda.web.Dtos.*;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reunions")
@RequiredArgsConstructor
public class ReunionController {

    private final ReunionService service;

    @GetMapping
    public List<ReunionDto> lister() {
        return service.lister();
    }

    @GetMapping("/{id}")
    public ReunionDto detail(@PathVariable UUID id) {
        return service.detail(id);
    }

    @GetMapping(value = "/{id}/invitation.ics", produces = "text/calendar")
    public ResponseEntity<byte[]> invitation(@PathVariable UUID id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("invitation.ics").build().toString())
                .contentType(new MediaType("text", "calendar", StandardCharsets.UTF_8))
                .body(service.invitation(id).getBytes(StandardCharsets.UTF_8));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public ReunionDto creer(@Valid @RequestBody ReunionRequest req) {
        return service.creer(req);
    }

    @PostMapping("/{id}/proposition")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public ReunionDto proposer(@PathVariable UUID id, @Valid @RequestBody PropositionRequest req) {
        return service.proposer(id, req);
    }

    @PostMapping("/{id}/confirmation")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ReunionDto confirmer(@PathVariable UUID id, @Valid @RequestBody ConfirmationRequest req) {
        return service.confirmer(id, req.creneauId());
    }

    @PostMapping("/{id}/report")
    public ReunionDto reporter(@PathVariable UUID id, @Valid @RequestBody MotifRequest req) {
        return service.reporter(id, req.motif());
    }

    @PostMapping("/{id}/annulation")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public ReunionDto annuler(@PathVariable UUID id, @Valid @RequestBody MotifRequest req) {
        return service.annuler(id, req.motif());
    }

    @PostMapping("/{id}/evaluation")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public ReunionDto evaluer(@PathVariable UUID id, @Valid @RequestBody EvaluationRequest req) {
        return service.evaluer(id, req);
    }

    @PutMapping("/{id}/compte-rendu")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public ReunionDto compteRendu(@PathVariable UUID id, @Valid @RequestBody CompteRenduRequest req) {
        return service.compteRendu(id, req.compteRendu());
    }

    @GetMapping("/disponibilites")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public List<PlageDto> disponibilites(@RequestParam(required = false) UUID entrepriseId) {
        return service.disponibilites(entrepriseId);
    }

    @PutMapping("/disponibilites")
    @PreAuthorize("hasRole('ENTREPRISE')")
    public List<PlageDto> remplacerDisponibilites(@RequestBody List<@Valid PlageRequest> plages) {
        return service.remplacerDisponibilites(plages);
    }
}
