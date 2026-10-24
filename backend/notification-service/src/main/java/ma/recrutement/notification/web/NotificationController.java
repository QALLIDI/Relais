package ma.recrutement.notification.web;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.notification.domain.Notification;
import ma.recrutement.notification.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notifications;

    @Value("${app.recruteur-email}")
    private String recruteur;

    public record NotificationDto(UUID id, String titre, String message, String type, boolean lu,
                                  OffsetDateTime createdAt) {
        static NotificationDto of(Notification n) {
            return new NotificationDto(n.getId(), n.getTitre(), n.getMessage(), n.getType(), n.isLu(), n.getCreatedAt());
        }
    }

    public record Compteur(long nonLues) {
    }

    @GetMapping
    public List<NotificationDto> mesNotifications() {
        return notifications.findTop50ByDestinataireIgnoreCaseOrderByCreatedAtDesc(destinataire()).stream()
                .map(NotificationDto::of).toList();
    }

    @GetMapping("/non-lues")
    public Compteur nonLues() {
        return new Compteur(notifications.countByDestinataireIgnoreCaseAndLuFalse(destinataire()));
    }

    @PatchMapping("/{id}/lu")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void marquerLue(@PathVariable UUID id) {
        Notification n = notifications.findById(id).orElseThrow(() -> new NotFoundException("Notification introuvable"));
        if (!n.getDestinataire().equalsIgnoreCase(destinataire())) {
            throw new AccessDeniedException("Cette notification ne vous est pas destinée");
        }
        n.setLu(true);
    }

    /** Le recruteur reçoit les notifications adressées à l'adresse du cabinet ; les autres, à leur e-mail Keycloak. */
    private String destinataire() {
        return CurrentUser.hasRole(Roles.RECRUTEUR) ? recruteur : CurrentUser.email();
    }
}
