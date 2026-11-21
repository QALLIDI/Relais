package ma.recrutement.selection.evaluation;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

/** Correction automatique, scores et mélange des choix des évaluations techniques. */
class CorrectionTest {

    @Test
    void qcmExactementLaBonneReponse() {
        assertThat(Correction.corriger("QCM", "1", "1")).isTrue();
        assertThat(Correction.corriger("CODE", "1", "2")).isFalse();
        assertThat(Correction.corriger("QCM", "1", "")).isFalse();
    }

    @Test
    void qcmMultiToutesLesBonnesEtSeulementElles() {
        assertThat(Correction.corriger("QCM_MULTI", "0,2", "2,0")).isTrue();
        assertThat(Correction.corriger("QCM_MULTI", "0,2", "0")).isFalse();
        assertThat(Correction.corriger("QCM_MULTI", "0,2", "0,1,2")).isFalse();
    }

    @Test
    void reponseCourteSansAccentsNiMajuscules() {
        String acceptees = "ordre|même partition";
        assertThat(Correction.corriger("COURTE", acceptees, "Pour garantir l'ORDRE des messages")).isTrue();
        assertThat(Correction.corriger("COURTE", acceptees, "Ils vont dans la meme partition")).isTrue();
        assertThat(Correction.corriger("COURTE", acceptees, "pour chiffrer")).isFalse();
    }

    @Test
    void questionOuverteAttendLeRecruteur() {
        assertThat(Correction.corriger("OUVERTE", null, "mon texte")).isNull();
        assertThat(Correction.corriger("CRITERE", null, null)).isNull();
    }

    @Test
    void scoreSurCentEtParCompetence() {
        List<Correction.Ligne> lignes = List.of(
                new Correction.Ligne("Java", 1, BigDecimal.ONE),
                new Correction.Ligne("Java", 1, BigDecimal.ZERO),
                new Correction.Ligne("SQL", 2, BigDecimal.valueOf(2)),
                new Correction.Ligne("Savoir-être", 3, null));

        assertThat(Correction.score(lignes)).isEqualTo(43); // 3 / 7
        assertThat(Correction.scoresParCompetence(lignes)).containsExactly(
                Map.entry("Java", 50), Map.entry("SQL", 100), Map.entry("Savoir-être", 0));
        assertThat(Correction.score(List.of())).isNull();
    }

    @Test
    void critereDeGrillePondere() {
        assertThat(Correction.pointsCritere(4, 2)).isEqualByComparingTo("1.60");
        assertThat(Correction.pointsCritere(9, 1)).isEqualByComparingTo("1.00");
    }

    @Test
    void scoresEncodesPuisDecodes() {
        Map<String, Integer> m = Map.of("Spring Boot", 83);
        assertThat(Correction.decoder(Correction.encoder(m))).isEqualTo(m);
        assertThat(Correction.decoder(null)).isEmpty();
    }

    @RepeatedTest(20)
    void melangerLesChoixGardeLaBonneReponse() {
        EvaluationQuestion q = new EvaluationQuestion();
        q.setChoix("dark\nnull\nundefined\nTypeError");
        q.setAttendues("1");

        EvaluationService.melangerChoix(q);

        List<String> choix = EvaluationDtos.lignes(q.getChoix());
        assertThat(choix).containsExactlyInAnyOrder("dark", "null", "undefined", "TypeError");
        int bonne = Correction.indices(q.getAttendues()).iterator().next();
        assertThat(choix.get(bonne)).isEqualTo("null");
    }
}
