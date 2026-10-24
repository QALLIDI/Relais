package ma.recrutement.selection.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.selection.service.SelectionService;
import ma.recrutement.selection.web.Dtos.AvisRequest;
import ma.recrutement.selection.web.Dtos.MaCandidatureDto;
import ma.recrutement.selection.web.Dtos.ProfilPresenteDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Endpoints de l'espace entreprise et de l'espace candidat. */
@RestController
@RequiredArgsConstructor
public class ClientController {

    private final SelectionService service;

    @GetMapping("/api/shortlists/mission/{missionId}")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public List<ProfilPresenteDto> profilsPresentes(@PathVariable UUID missionId) {
        return service.profilsPresentes(missionId);
    }

    @GetMapping("/api/shortlists/a-evaluer")
    @PreAuthorize("hasRole('ENTREPRISE')")
    public List<ProfilPresenteDto> aEvaluer() {
        return service.aEvaluer();
    }

    @PostMapping("/api/candidatures/{id}/avis")
    @PreAuthorize("hasRole('ENTREPRISE')")
    public ProfilPresenteDto donnerAvis(@PathVariable UUID id, @Valid @RequestBody AvisRequest req) {
        return service.donnerAvis(id, req);
    }

    @GetMapping("/api/candidatures/mes")
    @PreAuthorize("hasRole('CANDIDAT')")
    public List<MaCandidatureDto> mesCandidatures() {
        return service.mesCandidatures();
    }
}
