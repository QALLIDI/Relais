package ma.recrutement.notification.sms;

import java.util.LinkedHashMap;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Envoi réel par l'API Zavu ({@code POST /v1/messages}, canal SMS). Activé par {@code SMS_PROVIDER=zavu}.
 *
 * <p>La clé d'idempotence évite d'envoyer deux fois le même SMS quand Kafka rejoue un événement :
 * Zavu répond alors 409, que l'on traite comme un envoi déjà fait.</p>
 */
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "zavu")
@Slf4j
public class ZavuSmsSender implements SmsSender {

    private final RestClient client;
    private final String sender;

    public ZavuSmsSender(@Value("${app.sms.zavu.url:https://api.zavu.dev}") String url,
                         @Value("${app.sms.zavu.api-key}") String apiKey,
                         @Value("${app.sms.zavu.sender:}") String sender) {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("SMS_PROVIDER=zavu mais ZAVU_API_KEY est vide.");
        }
        this.client = RestClient.builder().baseUrl(url)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
        this.sender = sender;
    }

    @Override
    public void envoyer(String telephone, String texte) {
        envoyer(telephone, texte, null);
    }

    @Override
    public void envoyer(String telephone, String texte, String cleIdempotence) {
        Map<String, Object> corps = new LinkedHashMap<>();
        corps.put("to", telephone);
        corps.put("text", texte);
        corps.put("channel", "sms");
        if (cleIdempotence != null) {
            corps.put("idempotencyKey", cleIdempotence);
        }
        try {
            client.post().uri("/v1/messages")
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> {
                        if (StringUtils.hasText(sender)) {
                            h.set("Zavu-Sender", sender);
                        }
                    })
                    .body(corps)
                    .retrieve()
                    .toBodilessEntity();
            log.info("SMS envoyé par Zavu à {}", masquer(telephone));
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.CONFLICT) {
                log.info("SMS déjà envoyé (clé {}), rien à faire", cleIdempotence);
                return;
            }
            // 4xx : numéro refusé, clé invalide… Rejouer ne servirait à rien.
            log.error("Zavu refuse le SMS pour {} : {} {}", masquer(telephone), e.getStatusCode(), e.getResponseBodyAsString());
        }
        // Les erreurs 5xx et réseau remontent : Kafka rejoue l'événement, la clé d'idempotence évite le doublon.
    }

    private static String masquer(String e164) {
        return e164 == null || e164.length() < 4 ? "••••" : "••••" + e164.substring(e164.length() - 2);
    }
}
