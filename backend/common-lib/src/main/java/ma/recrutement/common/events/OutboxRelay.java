package ma.recrutement.common.events;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

/**
 * Envoie dans Kafka les événements en attente dans la table {@code outbox}, dans l'ordre d'écriture.
 * {@code for update skip locked} évite qu'un même événement parte deux fois quand plusieurs
 * instances du service tournent. Un envoi raté annule le lot, qui repart au passage suivant :
 * un message peut donc être livré deux fois, les consommateurs sont idempotents.
 */
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final JdbcClient jdbc;
    private final KafkaTemplate<String, String> kafka;

    public OutboxRelay(JdbcClient jdbc, KafkaTemplate<String, String> kafka) {
        this.jdbc = jdbc;
        this.kafka = kafka;
    }

    private record AEnvoyer(UUID id, String topic, String cle, String type, String payload) {
    }

    @Scheduled(fixedDelayString = "${app.outbox.delai-ms:500}")
    @Transactional
    public void publierEnAttente() throws Exception {
        List<AEnvoyer> lot = jdbc.sql("""
                        select id, topic, cle, type, payload::text as payload from outbox
                        where publie_le is null order by cree_le limit 100 for update skip locked""")
                .query(AEnvoyer.class)
                .list();
        for (AEnvoyer e : lot) {
            ProducerRecord<String, String> message = new ProducerRecord<>(e.topic(), e.cle(), e.payload());
            message.headers().add(Events.TYPE_HEADER, e.type().getBytes(StandardCharsets.UTF_8));
            message.headers().add(Events.ID_HEADER, e.id().toString().getBytes(StandardCharsets.UTF_8));
            kafka.send(message).get(10, TimeUnit.SECONDS);
            jdbc.sql("update outbox set publie_le = now() where id = :id").param("id", e.id()).update();
        }
        if (!lot.isEmpty()) {
            log.debug("{} événement(s) publié(s) dans Kafka", lot.size());
        }
    }

    /** Les événements publiés restent 7 jours pour le diagnostic, comme la rétention des topics. */
    @Scheduled(cron = "${app.outbox.purge-cron:0 30 3 * * *}")
    @Transactional
    public void purger() {
        int n = jdbc.sql("delete from outbox where publie_le < now() - interval '7 days'").update();
        jdbc.sql("delete from evenement_traite where traite_le < now() - interval '7 days'").update();
        log.info("Outbox purgée : {} événement(s) publié(s) supprimé(s)", n);
    }
}
