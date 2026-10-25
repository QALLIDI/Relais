package ma.recrutement.common.events;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.function.Consumer;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.header.Header;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lecture des messages Kafka côté consommateur. Kafka peut livrer un message deux fois :
 * {@link #traiter} enregistre l'identifiant de l'événement dans {@code evenement_traite},
 * dans la transaction du traitement, et ignore un événement déjà vu.
 *
 * <pre>{@code
 * @KafkaListener(topics = Topics.SELECTION)
 * @Transactional
 * public void recevoir(ConsumerRecord<String, String> m) {
 *     switch (recus.type(m)) {
 *         case Events.CANDIDAT_PLACE -> recus.traiter(m, CandidatPlaceEvent.class, this::surPlacement);
 *         default -> { }
 *     }
 * }
 * }</pre>
 */
public class EvenementsRecus {

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public EvenementsRecus(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Type de l'événement (en-tête {@link Events#TYPE_HEADER}), chaîne vide s'il manque. */
    public String type(ConsumerRecord<String, String> message) {
        String type = entete(message, Events.TYPE_HEADER);
        return type == null ? "" : type;
    }

    /** Désérialise l'événement et lance l'action, sauf si cet événement a déjà été traité. */
    @Transactional(propagation = Propagation.MANDATORY)
    public <T> void traiter(ConsumerRecord<String, String> message, Class<T> classe, Consumer<T> action) {
        String id = entete(message, Events.ID_HEADER);
        if (id != null) {
            int nouveau = jdbc.sql("insert into evenement_traite (id) values (:id) on conflict do nothing")
                    .param("id", UUID.fromString(id))
                    .update();
            if (nouveau == 0) {
                return;
            }
        }
        action.accept(json.readValue(message.value(), classe));
    }

    private static String entete(ConsumerRecord<String, String> message, String nom) {
        Header h = message.headers().lastHeader(nom);
        return h == null ? null : new String(h.value(), StandardCharsets.UTF_8);
    }
}
