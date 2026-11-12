package ma.recrutement.selection.qualification;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import ma.recrutement.selection.qualification.QualificationService.QualificationDto;
import ma.recrutement.selection.qualification.QualificationService.ReferenceDto;
import ma.recrutement.selection.qualification.QualificationService.TestDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Tests techniques et références d'une candidature (espace recruteur). */
@RestController
@RequestMapping("/api/candidatures/{id}")
@PreAuthorize("hasRole('RECRUTEUR')")
@RequiredArgsConstructor
public class QualificationController {

    private final QualificationService service;

    public record TestRequest(@NotBlank @Size(max = 160) String intitule, @Min(5) @Max(480) Integer dureeMinutes,
                              @Size(max = 500) String lien, LocalDate dateLimite, @Size(max = 2000) String message) {
    }

    public record CorrectionRequest(@NotNull @Min(0) @Max(100) Integer score, @Size(max = 2000) String commentaire) {
    }

    public record ReferenceRequest(@NotBlank @Size(max = 160) String nom, @Email String email, @Size(max = 40) String telephone,
                                   @Size(max = 200) String fonction, @NotBlank String lien, boolean accordCandidat) {
    }

    public record RetourRequest(@Size(max = 4000) String avis, Boolean recommande) {
    }

    @GetMapping("/qualification")
    public QualificationDto qualification(@PathVariable UUID id) {
        return service.qualification(id);
    }

    @PostMapping("/tests")
    @ResponseStatus(HttpStatus.CREATED)
    public TestDto envoyerTest(@PathVariable UUID id, @Valid @RequestBody TestRequest req) {
        return service.envoyerTest(id, req.intitule(), req.dureeMinutes(), req.lien(), req.dateLimite(), req.message());
    }

    @PutMapping("/tests/{testId}/correction")
    public TestDto corriger(@PathVariable UUID id, @PathVariable UUID testId, @Valid @RequestBody CorrectionRequest req) {
        return service.corrigerTest(id, testId, req.score(), req.commentaire());
    }

    @PostMapping("/references")
    @ResponseStatus(HttpStatus.CREATED)
    public ReferenceDto demanderReference(@PathVariable UUID id, @Valid @RequestBody ReferenceRequest req) {
        return service.demanderReference(id, req.nom(), req.email(), req.telephone(), req.fonction(), req.lien(), req.accordCandidat());
    }

    @PostMapping("/references/{referenceId}/relance")
    public ReferenceDto relancer(@PathVariable UUID id, @PathVariable UUID referenceId) {
        return service.relancerReference(id, referenceId);
    }

    @PutMapping("/references/{referenceId}/retour")
    public ReferenceDto retour(@PathVariable UUID id, @PathVariable UUID referenceId, @Valid @RequestBody RetourRequest req) {
        return service.saisirRetour(id, referenceId, req.avis(), req.recommande());
    }
}
