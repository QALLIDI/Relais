package ma.recrutement.selection.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Score de correspondance candidat ↔ mission, sur 100 :
 * compétences requises 60, expérience 20, ville 10, prétentions salariales 10.
 */
public final class Matching {

    private Matching() {
    }

    public static int score(List<String> competencesRequises, Integer experienceMin, String villeMission,
                            BigDecimal salaireMax, List<String> competencesCandidat, int anneesExperience,
                            String villeCandidat, BigDecimal pretention) {
        double total = 0;

        Set<String> requises = normaliser(competencesRequises);
        if (requises.isEmpty()) {
            total += 60;
        } else {
            Set<String> detenues = normaliser(competencesCandidat);
            long communes = requises.stream().filter(detenues::contains).count();
            total += 60.0 * communes / requises.size();
        }

        if (experienceMin == null || experienceMin <= 0 || anneesExperience >= experienceMin) {
            total += 20;
        } else {
            total += 20.0 * anneesExperience / experienceMin;
        }

        if (villeMission == null || villeMission.isBlank()
                || (villeCandidat != null && villeCandidat.trim().equalsIgnoreCase(villeMission.trim()))) {
            total += 10;
        }

        if (salaireMax == null || pretention == null || pretention.compareTo(salaireMax) <= 0) {
            total += 10;
        }

        return (int) Math.round(total);
    }

    private static Set<String> normaliser(List<String> valeurs) {
        return valeurs == null ? Set.of() : valeurs.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(v -> v.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }
}
