package ma.recrutement.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.notification.domain.Notification;
import ma.recrutement.notification.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Enregistre la notification in-app puis tente l'envoi de l'e-mail (un échec SMTP ne bloque pas). */
@Component
@RequiredArgsConstructor
@Slf4j
public class Notifier {

    private final NotificationRepository notifications;
    private final JavaMailSender mail;

    @Value("${app.mail.from}")
    private String from;

    /** Pièce jointe d'un e-mail, par exemple l'invitation calendrier d'une réunion. */
    public record PieceJointe(String nom, String typeMime, byte[] contenu) {
    }

    @Transactional
    public void notifier(String destinataire, String type, String titre, String message) {
        notifier(destinataire, type, titre, message, null);
    }

    @Transactional
    public void notifier(String destinataire, String type, String titre, String message, PieceJointe piece) {
        if (destinataire == null || destinataire.isBlank()) {
            log.warn("Notification {} ignorée : aucun destinataire", type);
            return;
        }
        Notification n = new Notification();
        n.setDestinataire(destinataire);
        n.setType(type);
        n.setTitre(titre);
        n.setMessage(message);
        try {
            String texte = message + "\n\n— Envoyé automatiquement par la plateforme de recrutement.";
            if (piece == null) {
                SimpleMailMessage email = new SimpleMailMessage();
                email.setFrom(from);
                email.setTo(destinataire);
                email.setSubject(titre);
                email.setText(texte);
                mail.send(email);
            } else {
                MimeMessage email = mail.createMimeMessage();
                MimeMessageHelper aide = new MimeMessageHelper(email, true, "UTF-8");
                aide.setFrom(from);
                aide.setTo(destinataire);
                aide.setSubject(titre);
                aide.setText(texte);
                aide.addAttachment(piece.nom(), new ByteArrayResource(piece.contenu()), piece.typeMime());
                mail.send(email);
            }
            n.setEmailEnvoye(true);
        } catch (Exception e) {
            log.warn("Envoi de l'e-mail à {} impossible : {}", destinataire, e.getMessage());
        }
        notifications.save(n);
    }
}
