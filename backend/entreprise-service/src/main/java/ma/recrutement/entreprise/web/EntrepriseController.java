package ma.recrutement.entreprise.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.entreprise.domain.DemandeRattachement;
import ma.recrutement.entreprise.repository.DemandeRattachementRepository;
import ma.recrutement.entreprise.service.EntrepriseService;
import ma.recrutement.entreprise.service.RattachementService;
import ma.recrutement.entreprise.web.Dtos.DemandeRattachementDto;
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
    private final DemandeRattachementRepository demandes;
    private final RattachementService rattachements;

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

    /** Comptes entreprise inscrits en ligne, en attente de rattachement à une entreprise. */
    @GetMapping("/demandes-rattachement")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<DemandeRattachementDto> demandesRattachement() {
        return demandes.findByStatutOrderByCreatedAtAsc(DemandeRattachement.EN_ATTENTE).stream()
                .map(DemandeRattachementDto::of).toList();
    }

    /** Rattache le compte à l'entreprise choisie : il devient un contact et la demande est close. */
    @PostMapping("/demandes-rattachement/{id}/acceptation")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public EntrepriseDto accepterRattachement(@PathVariable UUID id, @Valid @RequestBody AcceptationRequest req) {
        return rattachements.accepter(id, req.entrepriseId());
    }

    @PostMapping("/demandes-rattachement/{id}/refus")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public void refuserRattachement(@PathVariable UUID id) {
        rattachements.refuser(id);
    }

    public record AcceptationRequest(@NotNull UUID entrepriseId) {
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
