package ma.recrutement.notification.sms;

/**
 * Envoi d'un SMS. L'implémentation est choisie par {@code SMS_PROVIDER} : {@code console} en local
 * ({@link ConsoleSmsSender}) ; un vrai fournisseur (Twilio, Infobip…) s'ajoute en implémentant cette interface.
 */
public interface SmsSender {

    /** @param telephone numéro au format E.164 (+212612345678) */
    void envoyer(String telephone, String texte);
}
