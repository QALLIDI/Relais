package ma.recrutement.compte.equipe;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import ma.recrutement.compte.equipe.EquipeService.Invitation;
import ma.recrutement.compte.equipe.EquipeService.Membre;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Équipe de l'entreprise connectée : membres, invitations, relances et retraits. */
@RestController
@RequestMapping("/api/comptes/equipe")
@RequiredArgsConstructor
public class EquipeController {

    private final EquipeService service;

    public record InvitationRequest(@NotBlank @Email String email, @Size(max = 80) String prenom,
                                    @Size(max = 80) String nom, @Size(max = 120) String fonction) {
    }

    @GetMapping
    public List<Membre> membres() {
        return service.membres();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Membre inviter(@Valid @RequestBody InvitationRequest req) {
        return service.inviter(new Invitation(req.email(), req.prenom(), req.nom(), req.fonction()));
    }

    @PostMapping("/{id}/relance")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void relancer(@PathVariable String id) {
        service.relancer(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void retirer(@PathVariable String id) {
        service.retirer(id);
    }
}
