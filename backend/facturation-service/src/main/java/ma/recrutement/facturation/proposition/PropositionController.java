package ma.recrutement.facturation.proposition;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import ma.recrutement.facturation.proposition.PropositionService.Demande;
import ma.recrutement.facturation.proposition.PropositionService.PropositionDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/facturation/propositions")
@RequiredArgsConstructor
public class PropositionController {

    private final PropositionService service;

    public record PropositionRequest(@NotNull UUID entrepriseId, @NotBlank String entrepriseNom, @Email String contactEmail,
                                     @Size(max = 200) String poste, @NotBlank String formule, BigDecimal taux,
                                     BigDecimal montant, int acomptePct, int garantieMois) {
    }

    public record RefusRequest(@Size(max = 500) String motif) {
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public List<PropositionDto> lister() {
        return service.lister();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public PropositionDto envoyer(@Valid @RequestBody PropositionRequest r) {
        return service.envoyer(new Demande(r.entrepriseId(), r.entrepriseNom(), r.contactEmail(), r.poste(), r.formule(),
                r.taux(), r.montant(), r.acomptePct(), r.garantieMois()));
    }

    @PostMapping("/{id}/acceptation")
    @PreAuthorize("hasRole('ENTREPRISE')")
    public PropositionDto accepter(@PathVariable UUID id) {
        return service.accepter(id);
    }

    @PostMapping("/{id}/refus")
    @PreAuthorize("hasRole('ENTREPRISE')")
    public PropositionDto refuser(@PathVariable UUID id, @Valid @RequestBody RefusRequest r) {
        return service.refuser(id, r.motif());
    }
}
