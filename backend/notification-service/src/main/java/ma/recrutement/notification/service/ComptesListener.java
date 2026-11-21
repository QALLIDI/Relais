package ma.recrutement.notification.service;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.CodeSmsEvent;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.Topics;
import ma.recrutement.notification.sms.SmsSender;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Événements de compte-service : envoi du code de vérification par SMS. Le code n'est pas
 * enregistré dans les notifications (il ne doit pas rester en base).
 */
@Component
@RequiredArgsConstructor
public class ComptesListener {

    private final EvenementsRecus recus;
    private final SmsSender sms;

    @KafkaListener(topics = Topics.COMPTE)
    @Transactional
    public void recevoir(ConsumerRecord<String, String> message) {
        if (Events.COMPTE_CODE_SMS.equals(recus.type(message))) {
            recus.traiter(message, CodeSmsEvent.class, this::codeSms);
        }
    }

    void codeSms(CodeSmsEvent e) {
        sms.envoyer(e.telephone(), "Relais : votre code de vérification est %s. Il expire dans %d minutes. Ne le communiquez à personne."
                .formatted(e.code(), e.validiteMinutes()), "code-" + e.inscriptionId() + "-" + e.code());
    }
}
