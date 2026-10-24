package ma.recrutement.common.events;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record FactureEmiseEvent(
        UUID factureId,
        String numero,
        UUID entrepriseId,
        String entrepriseNom,
        BigDecimal montantTtc,
        LocalDate echeance,
        String contactEmail) {
}
