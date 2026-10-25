package ma.recrutement.compte.web;

import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.compte.inscription.InscriptionException;
import ma.recrutement.compte.inscription.InscriptionService;
import ma.recrutement.compte.web.Dtos.CodeRequest;
import ma.recrutement.compte.web.Dtos.CompteRequest;
import ma.recrutement.compte.web.Dtos.DebutRequest;
import ma.recrutement.compte.web.Dtos.InscriptionDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.*;

/** Parcours d'inscription, ouvert sans connexion (la gateway limite le débit par adresse IP). */
@RestController
@RequestMapping("/public/inscription")
@RequiredArgsConstructor
public class InscriptionController {

    private final InscriptionService service;

    /** Étape 1 : type de compte et e-mail. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InscriptionDto commencer(@Valid @RequestBody DebutRequest req) {
        return service.commencer(req);
    }

    @GetMapping("/{id}")
    public InscriptionDto etat(@PathVariable UUID id) {
        return service.etat(id);
    }

    /** Étape 2 : téléphone et mot de passe ; le code SMS part aussitôt. */
    @PostMapping("/{id}/compte")
    public InscriptionDto compte(@PathVariable UUID id, @Valid @RequestBody CompteRequest req) {
        return service.definirCompte(id, req);
    }

    @PostMapping("/{id}/code/renvoi")
    public InscriptionDto renvoyerCode(@PathVariable UUID id) {
        return service.renvoyerCode(id);
    }

    /** Étape 3 : code SMS. */
    @PostMapping("/{id}/code/verification")
    public InscriptionDto verifierCode(@PathVariable UUID id, @Valid @RequestBody CodeRequest req) {
        return service.verifierCode(id, req.code());
    }

    @PostMapping("/{id}/email/renvoi")
    public InscriptionDto renvoyerEmail(@PathVariable UUID id) {
        return service.renvoyerEmail(id);
    }

    @ExceptionHandler(InscriptionException.class)
    public ProblemDetail refus(InscriptionException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(e.statut(), e.getMessage());
        if (e.reessayerDans() != null) {
            p.setProperty("reessayerDans", e.reessayerDans());
        }
        return p;
    }
}
