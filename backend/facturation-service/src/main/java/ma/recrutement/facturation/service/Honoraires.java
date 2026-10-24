package ma.recrutement.facturation.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Calcul des honoraires de placement et de la TVA. */
public final class Honoraires {

    public static final BigDecimal TAUX_PAR_DEFAUT = new BigDecimal("15");
    public static final BigDecimal TVA = new BigDecimal("20");

    private Honoraires() {
    }

    public record Montants(BigDecimal ht, BigDecimal tva, BigDecimal ttc) {
    }

    public static BigDecimal honorairesHt(BigDecimal salaireAnnuel, BigDecimal tauxPourcent) {
        BigDecimal taux = tauxPourcent == null ? TAUX_PAR_DEFAUT : tauxPourcent;
        return salaireAnnuel.multiply(taux).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }

    public static Montants avecTva(BigDecimal ht) {
        BigDecimal tva = ht.multiply(TVA).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        return new Montants(ht.setScale(2, RoundingMode.HALF_UP), tva, ht.add(tva).setScale(2, RoundingMode.HALF_UP));
    }
}
