package ma.recrutement.notification.service;

import java.util.Locale;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.notification.domain.Notification;
import ma.recrutement.notification.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Enregistre la notification in-app puis tente l'envoi de l'e-mail (un échec SMTP ne bloque pas).
 * L'e-mail part en HTML (modèle commun mail/notification.html) avec une version texte.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class Notifier {

    private static final String MODELE = "mail/notification";

    private final NotificationRepository notifications;
    private final JavaMailSender mail;
    private final ITemplateEngine modeles;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.front-url}")
    private String front;

    /** Pièce jointe d'un e-mail, par exemple l'invitation calendrier d'une réunion. */
    public record PieceJointe(String nom, String typeMime, byte[] contenu) {
    }

    @Transactional
    public void notifier(String destinataire, String type, String titre, String message) {
        notifier(destinataire, type, titre, message, null, null);
    }

    @Transactional
    public void notifier(String destinataire, String type, String titre, String message, PieceJointe piece) {
        notifier(destinataire, type, titre, message, piece, null);
    }

    @Transactional
    public void notifier(String destinataire, String type, String titre, String message, Mise mise) {
        notifier(destinataire, type, titre, message, null, mise);
    }

    /**
     * @param mise mise en forme HTML ; si elle est absente, elle est déduite du message
     *             (paragraphes, premier lien transformé en bouton).
     */
    @Transactional
    public void notifier(String destinataire, String type, String titre, String message, PieceJointe piece, Mise mise) {
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
            MimeMessage email = mail.createMimeMessage();
            MimeMessageHelper aide = new MimeMessageHelper(email, true, "UTF-8");
            aide.setFrom(from);
            aide.setTo(destinataire);
            aide.setSubject(titre);
            aide.setText(texte, html(titre, mise != null ? mise : Mise.depuisTexte(message)));
            if (piece != null) {
                aide.addAttachment(piece.nom(), new ByteArrayResource(piece.contenu()), piece.typeMime());
            }
            mail.send(email);
            n.setEmailEnvoye(true);
        } catch (Exception e) {
            log.warn("Envoi de l'e-mail à {} impossible : {}", destinataire, e.getMessage());
        }
        notifications.save(n);
    }

    String html(String titre, Mise mise) {
        Context contexte = new Context(Locale.FRENCH);
        contexte.setVariable("titre", titre);
        contexte.setVariable("mise", mise);
        contexte.setVariable("front", front);
        return modeles.process(MODELE, contexte);
    }
}
