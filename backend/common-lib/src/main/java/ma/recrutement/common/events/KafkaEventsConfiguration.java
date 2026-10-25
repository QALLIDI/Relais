package ma.recrutement.common.events;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import javax.sql.DataSource;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.config.TopicConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.util.backoff.FixedBackOff;
import tools.jackson.databind.json.JsonMapper;

/**
 * Socle Kafka commun aux services métier :
 * <ul>
 *   <li>création des topics de chaque service et de leurs topics d'erreurs {@code .DLT} (idempotent) ;</li>
 *   <li>3 nouvelles tentatives espacées d'une seconde, puis envoi du message dans {@code <topic>.DLT} ;</li>
 *   <li>publication par outbox transactionnelle ({@link EventPublisher}, {@link OutboxRelay}) ;</li>
 *   <li>lecture idempotente ({@link EvenementsRecus}).</li>
 * </ul>
 * Spring Boot branche le {@link CommonErrorHandler} sur les {@code @KafkaListener}. Le groupe de
 * consommateurs de chaque service est son nom ({@code spring.kafka.consumer.group-id}).
 */
@AutoConfiguration
@ConditionalOnClass({KafkaTemplate.class, JdbcClient.class})
@EnableScheduling
public class KafkaEventsConfiguration {

    @Bean
    public KafkaAdmin.NewTopics recrutementTopics(
            @Value("${app.kafka.partitions:3}") int partitions,
            @Value("${app.kafka.replication:1}") short replication,
            @Value("${app.kafka.retention:7d}") Duration retention) {
        List<NewTopic> topics = new ArrayList<>();
        for (String topic : Topics.TOUS) {
            for (String nom : List.of(topic, topic + Topics.SUFFIXE_ERREURS)) {
                topics.add(TopicBuilder.name(nom)
                        .partitions(partitions)
                        .replicas(replication)
                        .config(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(retention.toMillis()))
                        .build());
            }
        }
        return new KafkaAdmin.NewTopics(topics.toArray(NewTopic[]::new));
    }

    @Bean
    public CommonErrorHandler recrutementErrorHandler(KafkaTemplate<String, String> kafka) {
        // Le message en échec part dans la même partition de <topic>.DLT, qui a autant de partitions.
        // (Spring Kafka 4 viserait <topic>-dlt par défaut, topic qui n'existe pas : la destination est explicite.)
        DeadLetterPublishingRecoverer versErreurs = new DeadLetterPublishingRecoverer(kafka,
                (message, erreur) -> new TopicPartition(message.topic() + Topics.SUFFIXE_ERREURS, message.partition()));
        return new DefaultErrorHandler(versErreurs, new FixedBackOff(1000L, 3));
    }

    @Bean
    public EventPublisher eventPublisher(DataSource dataSource, JsonMapper json) {
        return new EventPublisher(JdbcClient.create(dataSource), json);
    }

    @Bean
    public OutboxRelay outboxRelay(DataSource dataSource, KafkaTemplate<String, String> kafka) {
        return new OutboxRelay(JdbcClient.create(dataSource), kafka);
    }

    @Bean
    public EvenementsRecus evenementsRecus(DataSource dataSource, JsonMapper json) {
        return new EvenementsRecus(JdbcClient.create(dataSource), json);
    }
}
