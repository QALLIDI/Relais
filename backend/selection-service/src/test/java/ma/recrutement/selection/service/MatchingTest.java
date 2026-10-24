package ma.recrutement.selection.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

class MatchingTest {

    @Test
    void profilParfaitObtient100() {
        int score = Matching.score(List.of("Java", "Spring Boot"), 5, "Casablanca", new BigDecimal("300000"),
                List.of("java", "spring boot", "React"), 7, "casablanca", new BigDecimal("250000"));
        assertEquals(100, score);
    }

    @Test
    void competencesPartiellesEtExperienceInsuffisante() {
        // 1 compétence sur 2 = 30, 3 ans sur 6 = 10, autre ville = 0, prétentions trop hautes = 0
        int score = Matching.score(List.of("Java", "Kafka"), 6, "Casablanca", new BigDecimal("200000"),
                List.of("Java"), 3, "Rabat", new BigDecimal("250000"));
        assertEquals(40, score);
    }

    @Test
    void missionSansCriteresDonneLeMaximum() {
        assertEquals(100, Matching.score(List.of(), null, null, null, List.of(), 0, null, null));
    }
}
