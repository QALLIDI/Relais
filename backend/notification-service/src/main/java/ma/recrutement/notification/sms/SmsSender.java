package ma.recrutement.notification.sms;

/**
 * Envoi d'un SMS. L'implémentation est choisie par {@code SMS_PROVIDER} : {@code console} en local
 * ({@link ConsoleSmsSender}) ; {@code zavu} en production ({@link ZavuSmsSender}).
 */
public interface SmsSender {

    /** @param telephone numéro au format E.164 (+212612345678) */
    void envoyer(String telephone, String texte);

    /**
     * Même envoi, avec une clé qui empêche un doublon si l'événement est rejoué.
     * Par défaut la clé est ignorée.
     */
    default void envoyer(String telephone, String texte, String cleIdempotence) {
        envoyer(telephone, texte);
    }
}
