package ma.recrutement.common.events;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;

/**
 * Déclare l'exchange commun et un convertisseur JSON. Spring Boot branche automatiquement
 * ce convertisseur sur le RabbitTemplate et sur les @RabbitListener.
 */
@AutoConfiguration
@ConditionalOnClass(RabbitTemplate.class)
public class RabbitEventsConfiguration {

    @Bean
    public TopicExchange recrutementExchange() {
        return new TopicExchange(Events.EXCHANGE, true, false);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter("ma.recrutement.common.events");
    }
}
