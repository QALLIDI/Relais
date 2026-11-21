package ma.recrutement.selection.evaluation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Requêtes et réponses de l'API d'évaluation. */
public final class EvaluationDtos {

    private EvaluationDtos() {
    }

    static List<String> lignes(String texte) {
        return texte == null || texte.isBlank() ? List.of() : Arrays.stream(texte.split("\n")).map(String::strip).toList();
    }

    // ---- Banque et modèles (recruteur) ----

    public record QuestionRequest(@NotBlank String type, @NotBlank @Size(max = 4000) String enonce, @Size(max = 4000) String code,
                                  @Size(max = 30) String langage, List<@Size(max = 500) String> choix, @Size(max = 500) String attendues,
                                  @Size(max = 1000) String indice, @Size(max = 2000) String explication,
                                  @NotBlank @Size(max = 60) String competence, @NotBlank String niveau, @Min(1) @Max(10) int points) {
    }

    public record QuestionDto(UUID id, String type, String enonce, String code, String langage, List<String> choix,
                              String attendues, String indice, String explication, String competence, String niveau,
                              int points, boolean plateforme, String auteur, int utilisations) {
        static QuestionDto of(Question q) {
            return new QuestionDto(q.getId(), q.getType(), q.getEnonce(), q.getCode(), q.getLangage(), lignes(q.getChoix()),
                    q.getAttendues(), q.getIndice(), q.getExplication(), q.getCompetence(), q.getNiveau(), q.getPoints(),
                    q.isPlateforme(), q.getAuteur(), q.getUtilisations());
        }
    }

    public record ElementRequest(UUID questionId, @Size(max = 60) String competence, String niveau, @Min(1) @Max(50) Integer nombre,
                                 @Size(max = 200) String libelle, @Size(max = 2000) String guides, @Min(1) @Max(10) Integer poids) {
    }

    public record ModeleRequest(@NotBlank String mode, @NotBlank @Size(max = 160) String intitule, @Size(max = 400) String competences,
                                @Min(5) @Max(240) Integer dureeMinutes, @Min(0) @Max(100) int seuil, @Min(1) @Max(60) int delaiJours,
                                boolean melanger, boolean indices, boolean scoreVisible, boolean pleinEcran, boolean signaux,
                                @Min(1) @Max(20) int alerteSorties, @Min(1) @Max(600) int alerteSecondes,
                                @NotNull @Size(min = 1, max = 40) List<@Valid ElementRequest> elements) {
    }

    public record ElementDto(UUID id, UUID questionId, String questionEnonce, String competence, String niveau, Integer nombre,
                             String libelle, List<String> guides, Integer poids) {
    }

    public record ModeleDto(UUID id, String mode, String intitule, List<String> competences, Integer dureeMinutes, int seuil,
                            int delaiJours, boolean melanger, boolean indices, boolean scoreVisible, boolean pleinEcran,
                            boolean signaux, int alerteSorties, int alerteSecondes, String auteur, int utilisations,
                            int nombreQuestions, int points, List<ElementDto> elements) {
    }

    // ---- Envoi, suivi et résultats (recruteur) ----

    public record EnvoiRequest(@NotNull UUID modeleId, LocalDate dateLimite, @Size(max = 2000) String message) {
    }

    public record EvaluationResume(UUID id, UUID candidatureId, String candidatNom, String missionIntitule, String mode,
                                   String intitule, String statut, Integer dureeMinutes, LocalDate dateLimite,
                                   OffsetDateTime envoyeeLe, OffsetDateTime debut, OffsetDateTime fin, Integer score, int seuil,
                                   Map<String, Integer> scoresCompetences, int aNoter, Integrite integrite) {
    }

    /** Résumé des signaux d'intégrité ; {@code alerte} au-delà du seuil du modèle. */
    public record Integrite(int sorties, long secondesHors, int collages, int aVerifier, boolean alerte) {
    }

    public record LigneResultat(UUID id, int ordre, String type, String enonce, String code, String langage, List<String> choix,
                                String attendues, String explication, String competence, int points, String reponse,
                                Boolean correcte, BigDecimal pointsObtenus, Long tempsMs, boolean aVerifier, String motifVerification) {
    }

    public record EvenementDto(Integer ordre, String type, OffsetDateTime debut, Long dureeMs, Integer longueur) {
    }

    public record EvaluationDetail(EvaluationResume resume, String commentaire, List<LigneResultat> lignes,
                                   List<EvenementDto> evenements) {
    }

    public record NoteRequest(@NotNull UUID ligneId, @NotNull @Min(0) @Max(10) BigDecimal valeur, @Size(max = 2000) String commentaire) {
    }

    public record NotesRequest(@NotNull List<@Valid NoteRequest> notes, @Size(max = 4000) String commentaire, boolean terminer) {
    }

    // ---- Passage (candidat) ----

    public record MonTest(UUID id, String intitule, String missionIntitule, String entrepriseNom, String statut,
                          int nombreQuestions, Integer dureeMinutes, LocalDate dateLimite, OffsetDateTime envoyeeLe,
                          OffsetDateTime fin, Integer score, String message, boolean pleinEcran) {
    }

    public record QuestionPassage(int ordre, String type, String enonce, String code, String langage, List<String> choix,
                                  String indice, String competence, String reponse) {
    }

    public record Passage(UUID id, String intitule, String missionIntitule, String entrepriseNom, String statut,
                          OffsetDateTime debut, long secondesRestantes, boolean pleinEcran, boolean signaux,
                          List<QuestionPassage> questions) {
    }

    public record ReponseRequest(@Size(max = 8000) String reponse, @Min(0) Long tempsMs) {
    }

    public record EvenementRequest(Integer ordre, @NotBlank String type, @NotNull OffsetDateTime debut, @Min(0) Long dureeMs,
                                   @Min(0) Integer longueur) {
    }

    public record Fin(String statut, Integer score, Map<String, Integer> scoresCompetences, boolean provisoire) {
    }
}
