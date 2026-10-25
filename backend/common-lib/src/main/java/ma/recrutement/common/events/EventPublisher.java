package ma.recrutement.common.events;

import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Publication d'un événement par « transactional outbox » : l'événement est écrit dans la table
 * {@code outbox} dans la même transaction que la donnée métier, puis {@link OutboxRelay} l'envoie
 * dans Kafka. Si le service tombe entre les deux, rien n'est perdu.
 */
public class EventPublisher {

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public EventPublisher(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /**
     * @param topic     topic du service émetteur ({@link Topics})
     * @param type      type d'événement ({@link Events})
     * @param cle       identifiant de l'objet concerné, clé du message Kafka
     * @param evenement corps de l'événement, sérialisé en JSON
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void publier(String topic, String type, Object cle, Object evenement) {
        jdbc.sql("insert into outbox (id, topic, cle, type, payload) values (:id, :topic, :cle, :type, cast(:payload as jsonb))")
                .param("id", UUID.randomUUID())
                .param("topic", topic)
                .param("cle", cle == null ? null : cle.toString())
                .param("type", type)
                .param("payload", json.writeValueAsString(evenement))
                .update();
    }
}
