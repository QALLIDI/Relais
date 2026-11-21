package ma.recrutement.selection.evaluation;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import ma.recrutement.selection.evaluation.EvaluationDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * API des évaluations techniques. Recruteur : banque, modèles, envoi, résultats et notation.
 * Candidat : ses tests et leur passage (les réponses attendues ne lui sont jamais envoyées).
 */
@RestController
@Validated
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService service;

    // ---- Banque de questions ----

    @GetMapping("/api/selection/evaluation/questions")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<QuestionDto> questions() {
        return service.questions();
    }

    @PostMapping("/api/selection/evaluation/questions")
    @PreAuthorize("hasRole('RECRUTEUR')")
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionDto creerQuestion(@Valid @RequestBody QuestionRequest r) {
        return service.creerQuestion(r);
    }

    @PutMapping("/api/selection/evaluation/questions/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public QuestionDto modifierQuestion(@PathVariable UUID id, @Valid @RequestBody QuestionRequest r) {
        return service.modifierQuestion(id, r);
    }

    @DeleteMapping("/api/selection/evaluation/questions/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void retirerQuestion(@PathVariable UUID id) {
        service.retirerQuestion(id);
    }

    // ---- Modèles ----

    @GetMapping("/api/selection/evaluation/modeles")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<ModeleDto> modeles() {
        return service.modeles();
    }

    @PostMapping("/api/selection/evaluation/modeles")
    @PreAuthorize("hasRole('RECRUTEUR')")
    @ResponseStatus(HttpStatus.CREATED)
    public ModeleDto creerModele(@Valid @RequestBody ModeleRequest r) {
        return service.creerModele(r);
    }

    @PutMapping("/api/selection/evaluation/modeles/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public ModeleDto modifierModele(@PathVariable UUID id, @Valid @RequestBody ModeleRequest r) {
        return service.modifierModele(id, r);
    }

    // ---- Envoi, suivi, résultats ----

    @PostMapping("/api/candidatures/{id}/evaluations")
    @PreAuthorize("hasRole('RECRUTEUR')")
    @ResponseStatus(HttpStatus.CREATED)
    public EvaluationResume envoyer(@PathVariable UUID id, @Valid @RequestBody EnvoiRequest r) {
        return service.envoyer(id, r);
    }

    @GetMapping("/api/candidatures/{id}/evaluations")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<EvaluationResume> evaluationsDe(@PathVariable UUID id) {
        return service.evaluationsDe(id);
    }

    @GetMapping("/api/selection/evaluations")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<EvaluationResume> recentes() {
        return service.recentes();
    }

    @GetMapping("/api/selection/evaluations/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public EvaluationDetail detail(@PathVariable UUID id) {
        return service.detail(id);
    }

    @PutMapping("/api/selection/evaluations/{id}/notes")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public EvaluationDetail noter(@PathVariable UUID id, @Valid @RequestBody NotesRequest r) {
        return service.noter(id, r);
    }

    // ---- Passage par le candidat ----

    @GetMapping("/api/selection/mes-tests")
    @PreAuthorize("hasRole('CANDIDAT')")
    public List<MonTest> mesTests() {
        return service.mesTests();
    }

    @GetMapping("/api/selection/mes-tests/{id}")
    @PreAuthorize("hasRole('CANDIDAT')")
    public Passage passage(@PathVariable UUID id) {
        return service.passage(id, false);
    }

    @PostMapping("/api/selection/mes-tests/{id}/demarrer")
    @PreAuthorize("hasRole('CANDIDAT')")
    public Passage demarrer(@PathVariable UUID id) {
        return service.passage(id, true);
    }

    @PutMapping("/api/selection/mes-tests/{id}/reponses/{ordre}")
    @PreAuthorize("hasRole('CANDIDAT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void repondre(@PathVariable UUID id, @PathVariable int ordre, @Valid @RequestBody ReponseRequest r) {
        service.repondre(id, ordre, r);
    }

    @PostMapping("/api/selection/mes-tests/{id}/signaux")
    @PreAuthorize("hasRole('CANDIDAT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signaler(@PathVariable UUID id, @RequestBody @Size(max = 200) List<@Valid EvenementRequest> liste) {
        service.signaler(id, liste);
    }

    @PostMapping("/api/selection/mes-tests/{id}/terminer")
    @PreAuthorize("hasRole('CANDIDAT')")
    public Fin terminer(@PathVariable UUID id) {
        return service.terminer(id);
    }
}
