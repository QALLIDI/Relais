package ma.recrutement.common.events;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Proposition commerciale envoyée, acceptée ou refusée. {@code formule} : SUCCES (taux en % du salaire
 * annuel), FORFAIT (montant par poste) ou ABONNEMENT (montant mensuel).
 */
public record PropositionEvent(
        UUID propositionId,
        UUID entrepriseId,
        String entrepriseNom,
        String contactEmail,
        String poste,
        String formule,
        BigDecimal taux,
        BigDecimal montant,
        int acomptePct,
        int garantieMois,
        String motifRefus) {
}
