package ma.recrutement.compte.inscription;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import ma.recrutement.compte.config.CompteProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Données éphémères de l'inscription dans Redis :
 * <ul>
 *   <li>{@code inscription:<id>} : l'inscription (hash), 48 h ;</li>
 *   <li>{@code inscription:<id>:code} : code SMS haché (HMAC-SHA256) et nombre d'essais, 10 min ;</li>
 *   <li>{@code inscription:<id>:renvoi} et {@code :renvoi-email} : délai de 60 s entre deux envois ;</li>
 *   <li>{@code sms:<numéro>} : codes envoyés à ce numéro dans l'heure.</li>
 * </ul>
 */
@Component
public class InscriptionStore {

    private final StringRedisTemplate redis;
    private final ma.recrutement.compte.config.CompteProperties.Inscription regles;
    private final SecretKeySpec cleHmac;

    public InscriptionStore(StringRedisTemplate redis, CompteProperties props) {
        this.redis = redis;
        this.regles = props.inscription();
        this.cleHmac = new SecretKeySpec(regles.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    private static String cle(UUID id) {
        return "inscription:" + id;
    }

    public void enregistrer(Inscription i) {
        String k = cle(i.id());
        boolean nouvelle = !Boolean.TRUE.equals(redis.hasKey(k));
        redis.opsForHash().putAll(k, i.versHash());
        if (nouvelle) {
            redis.expire(k, regles.dureeInscription());
        }
    }

    public Optional<Inscription> trouver(UUID id) {
        Map<Object, Object> h = redis.opsForHash().entries(cle(id));
        return h.isEmpty() ? Optional.empty() : Optional.of(Inscription.depuisHash(id, h));
    }

    // ---- Code SMS ----

    public void enregistrerCode(UUID id, String code) {
        String k = cle(id) + ":code";
        redis.delete(k);
        redis.opsForHash().putAll(k, Map.of("hash", hacher(id, code), "essais", "0"));
        redis.expire(k, regles.dureeCode());
    }

    public void supprimerCode(UUID id) {
        redis.delete(cle(id) + ":code");
    }

    /** Résultat d'un essai : code absent (expiré), essais épuisés, faux ou bon. */
    public enum Essai { EXPIRE, EPUISE, FAUX, BON }

    public record ResultatEssai(Essai resultat, int essaisRestants) {
    }

    public ResultatEssai essayer(UUID id, String code) {
        String k = cle(id) + ":code";
        Object attendu = redis.opsForHash().get(k, "hash");
        if (attendu == null) {
            return new ResultatEssai(Essai.EXPIRE, 0);
        }
        long essais = redis.opsForHash().increment(k, "essais", 1);
        if (essais > regles.essaisMax()) {
            redis.delete(k);
            return new ResultatEssai(Essai.EPUISE, 0);
        }
        boolean bon = MessageDigest.isEqual(
                ((String) attendu).getBytes(StandardCharsets.UTF_8),
                hacher(id, code).getBytes(StandardCharsets.UTF_8));
        if (bon) {
            redis.delete(k);
            return new ResultatEssai(Essai.BON, 0);
        }
        int restants = (int) (regles.essaisMax() - essais);
        if (restants == 0) {
            redis.delete(k);
        }
        return new ResultatEssai(Essai.FAUX, restants);
    }

    private String hacher(UUID id, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(cleHmac);
            return HexFormat.of().formatHex(mac.doFinal((id + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC indisponible", e);
        }
    }

    // ---- Délais et quotas ----

    /** Secondes avant le prochain envoi possible (0 = possible maintenant). */
    public long attenteRenvoi(UUID id, String quoi) {
        Long ttl = redis.getExpire(cle(id) + ":" + quoi);
        return ttl == null || ttl < 0 ? 0 : ttl;
    }

    public void bloquerRenvoi(UUID id, String quoi) {
        redis.opsForValue().set(cle(id) + ":" + quoi, "1", regles.delaiRenvoi());
    }

    public void debloquerRenvoi(UUID id, String quoi) {
        redis.delete(cle(id) + ":" + quoi);
    }

    /**
     * Compte un envoi de SMS vers ce numéro. Renvoie 0 si l'envoi est permis, sinon le nombre de
     * secondes avant la fin de la fenêtre d'une heure.
     */
    public long compterEnvoiSms(String telephone) {
        String k = "sms:" + telephone;
        String n = redis.opsForValue().get(k);
        if (n != null && Integer.parseInt(n) >= regles.envoisParHeure()) {
            Long ttl = redis.getExpire(k);
            return ttl == null || ttl < 1 ? 1 : ttl;
        }
        Long total = redis.opsForValue().increment(k);
        if (total != null && total == 1) {
            redis.expire(k, Duration.ofHours(1));
        }
        return 0;
    }

    /** Verrou simple pour qu'une tâche planifiée ne tourne que sur une instance à la fois. */
    public boolean verrouiller(String nom, Duration duree) {
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent("verrou:" + nom, "1", duree));
    }
}
