package ma.recrutement.compte.inscription;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.Topics;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Publication dans {@code compte.events}. compte-service n'a pas de base, donc pas d'outbox :
 * l'envoi est synchrone, et un échec fait échouer l'étape (l'utilisateur peut réessayer).
 */
@Component
@RequiredArgsConstructor
public class EvenementsCompte {

    private final KafkaTemplate<String, String> kafka;
    private final JsonMapper json;

    public void publier(String type, Object cle, Object evenement) {
        ProducerRecord<String, String> message = new ProducerRecord<>(Topics.COMPTE, String.valueOf(cle), json.writeValueAsString(evenement));
        message.headers().add(Events.TYPE_HEADER, type.getBytes(StandardCharsets.UTF_8));
        message.headers().add(Events.ID_HEADER, UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8));
        try {
            kafka.send(message).get(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw indisponible();
        } catch (Exception e) {
            throw indisponible();
        }
    }

    private static InscriptionException indisponible() {
        return new InscriptionException(HttpStatus.SERVICE_UNAVAILABLE, "Service momentanément indisponible, réessayez dans un instant.");
    }
}
