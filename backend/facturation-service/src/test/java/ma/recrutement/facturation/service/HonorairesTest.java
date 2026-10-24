package ma.recrutement.facturation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class HonorairesTest {

    @Test
    void quinzePourcentDuSalaireAnnuel() {
        assertEquals(new BigDecimal("36000.00"), Honoraires.honorairesHt(new BigDecimal("240000"), new BigDecimal("15")));
    }

    @Test
    void tauxParDefautQuandLeClientNEnAPas() {
        assertEquals(new BigDecimal("30000.00"), Honoraires.honorairesHt(new BigDecimal("200000"), null));
    }

    @Test
    void tvaVingtPourcent() {
        Honoraires.Montants m = Honoraires.avecTva(new BigDecimal("26000"));
        assertEquals(new BigDecimal("5200.00"), m.tva());
        assertEquals(new BigDecimal("31200.00"), m.ttc());
    }
}
