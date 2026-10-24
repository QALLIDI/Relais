package ma.recrutement.entreprise.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.entreprise.service.EntrepriseService;
import ma.recrutement.entreprise.web.Dtos.EntrepriseDto;
import ma.recrutement.entreprise.web.Dtos.EntrepriseRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/entreprises")
@RequiredArgsConstructor
public class EntrepriseController {

    private final EntrepriseService service;

    @GetMapping
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<EntrepriseDto> lister() {
        return service.lister();
    }

    /** L'entreprise du contact connecté (espace entreprise). */
    @GetMapping("/me")
    @PreAuthorize("hasRole('ENTREPRISE')")
    public EntrepriseDto moi() {
        return service.detail(CurrentUser.entrepriseId());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public EntrepriseDto detail(@PathVariable UUID id) {
        return service.detail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public EntrepriseDto creer(@Valid @RequestBody EntrepriseRequest req) {
        return service.creer(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public EntrepriseDto modifier(@PathVariable UUID id, @Valid @RequestBody EntrepriseRequest req) {
        return service.modifier(id, req);
    }
}
