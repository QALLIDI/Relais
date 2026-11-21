package ma.recrutement.selection.evaluation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Correction automatique et calcul des scores. Classe sans état, testée à part.
 *
 * <ul>
 *   <li>QCM, CODE, QCM_MULTI : la réponse (indices « 0,2 ») doit être exactement l'ensemble attendu ;</li>
 *   <li>COURTE : la réponse, sans accents ni majuscules, doit contenir l'une des réponses acceptées (« a|b ») ;</li>
 *   <li>OUVERTE : notée par le recruteur ;</li>
 *   <li>CRITERE (grille) : note de 1 à 5 donnée par le recruteur, pondérée par les points.</li>
 * </ul>
 */
public final class Correction {

    public static final Set<String> TYPES = Set.of("QCM", "QCM_MULTI", "CODE", "COURTE", "OUVERTE");
    public static final Set<String> A_CHOIX = Set.of("QCM", "QCM_MULTI", "CODE");

    private Correction() {
    }

    /** {@code null} quand la question attend la note du recruteur (OUVERTE, CRITERE). */
    public static Boolean corriger(String type, String attendues, String reponse) {
        if (!A_CHOIX.contains(type) && !"COURTE".equals(type)) {
            return null;
        }
        if (reponse == null || reponse.isBlank()) {
            return false;
        }
        if ("COURTE".equals(type)) {
            String r = normaliser(reponse);
            return Arrays.stream(attendues == null ? new String[0] : attendues.split("\\|"))
                    .map(Correction::normaliser).filter(a -> !a.isEmpty()).anyMatch(r::contains);
        }
        return indices(attendues).equals(indices(reponse));
    }

    public static Set<Integer> indices(String liste) {
        Set<Integer> s = new TreeSet<>();
        if (liste == null) {
            return s;
        }
        for (String x : liste.split(",")) {
            if (!x.isBlank()) {
                s.add(Integer.parseInt(x.strip()));
            }
        }
        return s;
    }

    public static String normaliser(String texte) {
        String sansAccents = Normalizer.normalize(texte, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sansAccents.toLowerCase().replaceAll("[^a-z0-9]+", " ").strip();
    }

    /** Points obtenus pour une réponse corrigée automatiquement. */
    public static BigDecimal points(Boolean correcte, int points) {
        return Boolean.TRUE.equals(correcte) ? BigDecimal.valueOf(points) : BigDecimal.ZERO;
    }

    /** Ligne notée : la note du critère (1 à 5) est ramenée à ses points (poids × note / 5). */
    public static BigDecimal pointsCritere(int note, int poids) {
        int n = Math.max(1, Math.min(5, note));
        return BigDecimal.valueOf((long) poids * n).divide(BigDecimal.valueOf(5), 2, RoundingMode.HALF_UP);
    }

    /** Une ligne pour le calcul du score : compétence, points possibles, points obtenus ({@code null} = pas encore noté). */
    public record Ligne(String competence, int points, BigDecimal obtenus) {
    }

    /** Score sur 100, arrondi ; {@code null} s'il n'y a aucun point possible. Les lignes non notées comptent 0. */
    public static Integer score(Collection<Ligne> lignes) {
        int total = lignes.stream().mapToInt(Ligne::points).sum();
        if (total == 0) {
            return null;
        }
        BigDecimal obtenu = lignes.stream().map(l -> l.obtenus() == null ? BigDecimal.ZERO : l.obtenus())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return obtenu.multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(total), 0, RoundingMode.HALF_UP).intValue();
    }

    /** Scores par compétence, dans l'ordre d'apparition. */
    public static Map<String, Integer> scoresParCompetence(List<Ligne> lignes) {
        Map<String, List<Ligne>> parCompetence = lignes.stream()
                .collect(Collectors.groupingBy(Ligne::competence, LinkedHashMap::new, Collectors.toList()));
        Map<String, Integer> scores = new LinkedHashMap<>();
        parCompetence.forEach((c, ls) -> {
            Integer s = score(ls);
            if (s != null) {
                scores.put(c, s);
            }
        });
        return scores;
    }

    /** « Java:88;SQL:50 » et retour. */
    public static String encoder(Map<String, Integer> scores) {
        return scores.entrySet().stream().map(e -> e.getKey().replace(";", ",").replace(":", " ") + ":" + e.getValue())
                .collect(Collectors.joining(";"));
    }

    public static Map<String, Integer> decoder(String texte) {
        Map<String, Integer> m = new LinkedHashMap<>();
        if (texte == null || texte.isBlank()) {
            return m;
        }
        for (String part : texte.split(";")) {
            int i = part.lastIndexOf(':');
            if (i > 0) {
                m.put(part.substring(0, i), Integer.parseInt(part.substring(i + 1)));
            }
        }
        return m;
    }
}
