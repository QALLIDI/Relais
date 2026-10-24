package ma.recrutement.common.web;

/** Règle métier non respectée : renvoyée en 409. */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
