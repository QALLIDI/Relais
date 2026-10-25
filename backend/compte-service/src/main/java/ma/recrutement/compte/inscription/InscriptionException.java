package ma.recrutement.compte.inscription;

import org.springframework.http.HttpStatus;

/**
 * Refus d'une étape de l'inscription, avec son statut HTTP. {@code reessayerDans} (secondes) indique
 * au front quand l'action redevient possible (renvoi de code, quota de SMS).
 */
public class InscriptionException extends RuntimeException {

    private final HttpStatus statut;
    private final Long reessayerDans;

    public InscriptionException(HttpStatus statut, String message) {
        this(statut, message, null);
    }

    public InscriptionException(HttpStatus statut, String message, Long reessayerDans) {
        super(message);
        this.statut = statut;
        this.reessayerDans = reessayerDans;
    }

    public HttpStatus statut() {
        return statut;
    }

    public Long reessayerDans() {
        return reessayerDans;
    }
}
