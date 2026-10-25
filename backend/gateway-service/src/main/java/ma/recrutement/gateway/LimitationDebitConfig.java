package ma.recrutement.gateway;

import java.net.InetSocketAddress;
import java.util.Optional;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

/**
 * Limitation de débit (filtre RequestRateLimiter, compteurs dans Redis) : un quota par utilisateur
 * connecté, par adresse IP sinon. Le quota est réglé dans application.yml.
 */
@Configuration
public class LimitationDebitConfig {

    @Bean
    public KeyResolver cleLimitation() {
        return exchange -> exchange.getPrincipal()
                .map(p -> "utilisateur:" + p.getName())
                .switchIfEmpty(Mono.fromSupplier(() -> "ip:" + Optional.ofNullable(exchange.getRequest().getRemoteAddress())
                        .map(InetSocketAddress::getHostString)
                        .orElse("inconnue")));
    }
}
