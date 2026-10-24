package ma.recrutement.selection.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.selection.service.SelectionService;
import ma.recrutement.selection.web.Dtos.CompteRenduRequest;
import ma.recrutement.selection.web.Dtos.ConfirmationRequest;
import ma.recrutement.selection.web.Dtos.EntretienDto;
import ma.recrutement.selection.web.Dtos.EntretienRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/entretiens")
@RequiredArgsConstructor
public class EntretienController {

    private final SelectionService service;

    @GetMapping
    public List<EntretienDto> aVenir() {
        return service.entretiensAVenir();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public EntretienDto planifier(@Valid @RequestBody EntretienRequest req) {
        return service.planifier(req);
    }

    @PatchMapping("/{id}/confirmation")
    @PreAuthorize("hasRole('CANDIDAT')")
    public EntretienDto confirmer(@PathVariable UUID id, @RequestBody ConfirmationRequest req) {
        return service.confirmer(id, req.confirme());
    }

    @PatchMapping("/{id}/compte-rendu")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public EntretienDto compteRendu(@PathVariable UUID id, @RequestBody CompteRenduRequest req) {
        return service.compteRendu(id, req.compteRendu());
    }
}
