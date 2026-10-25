package ma.recrutement.common.events;

import java.util.UUID;

/** Code de vérification à envoyer par SMS pendant l'inscription (valable 10 minutes). */
public record CodeSmsEvent(
        UUID inscriptionId,
        String telephone,
        String code,
        int validiteMinutes) {
}
