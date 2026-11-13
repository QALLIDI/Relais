package ma.recrutement.entreprise.messagerie;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import ma.recrutement.entreprise.messagerie.MessagerieService.FilDto;
import ma.recrutement.entreprise.messagerie.MessagerieService.MessageDto;
import ma.recrutement.entreprise.messagerie.MessagerieService.NonLuDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/missions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
public class MessagerieController {

    private final MessagerieService service;

    public record EnvoiMessage(@NotBlank @Size(max = MessagerieService.LONGUEUR_MAX) String contenu) {
    }

    @GetMapping("/messagerie/fils")
    public List<FilDto> fils() {
        return service.fils();
    }

    @GetMapping("/messagerie/non-lus")
    public List<NonLuDto> nonLus() {
        return service.nonLus();
    }

    @GetMapping("/{id}/messages")
    public List<MessageDto> fil(@PathVariable UUID id) {
        return service.fil(id);
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto envoyer(@PathVariable UUID id, @Valid @RequestBody EnvoiMessage req) {
        return service.envoyer(id, req.contenu());
    }

    @PostMapping("/{id}/messages/lu")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void lu(@PathVariable UUID id) {
        service.marquerLu(id);
    }
}
