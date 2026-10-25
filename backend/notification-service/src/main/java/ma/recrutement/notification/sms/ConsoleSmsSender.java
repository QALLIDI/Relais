package ma.recrutement.notification.sms;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Adaptateur local : aucun SMS réel ne part. Le texte est écrit dans les logs et déposé dans Mailpit,
 * adressé à {@code <numéro>@<app.sms.console-domaine>}.
 */
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "console", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class ConsoleSmsSender implements SmsSender {

    private final JavaMailSender mail;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.sms.console-domaine:sms.recrutement.local}")
    private String domaine;

    @Override
    public void envoyer(String telephone, String texte) {
        log.info("[SMS console] à {} : {}", telephone, texte);
        try {
            SimpleMailMessage email = new SimpleMailMessage();
            email.setFrom(from);
            email.setTo(telephone.replace("+", "") + "@" + domaine);
            email.setSubject("SMS pour " + telephone);
            email.setText(texte);
            mail.send(email);
        } catch (Exception e) {
            log.warn("Copie du SMS dans Mailpit impossible : {}", e.getMessage());
        }
    }
}
