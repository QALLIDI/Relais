package ma.recrutement.entreprise.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.entreprise.domain.StatutMission;
import ma.recrutement.entreprise.service.MissionService;
import ma.recrutement.entreprise.web.Dtos.MissionDto;
import ma.recrutement.entreprise.web.Dtos.MissionRequest;
import ma.recrutement.entreprise.web.Dtos.MissionStats;
import ma.recrutement.entreprise.web.Dtos.StatutRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/missions")
@RequiredArgsConstructor
public class MissionController {

    private final MissionService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public List<MissionDto> lister(@RequestParam(required = false) StatutMission statut) {
        return service.lister(statut);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public MissionStats stats() {
        return service.stats();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public MissionDto detail(@PathVariable UUID id) {
        return service.detail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public MissionDto creer(@Valid @RequestBody MissionRequest req) {
        return service.creer(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public MissionDto modifier(@PathVariable UUID id, @Valid @RequestBody MissionRequest req) {
        return service.modifier(id, req);
    }

    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public MissionDto changerStatut(@PathVariable UUID id, @Valid @RequestBody StatutRequest req) {
        return service.changerStatut(id, req.statut());
    }
}
