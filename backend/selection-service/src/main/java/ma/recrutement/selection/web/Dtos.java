package ma.recrutement.selection.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import ma.recrutement.selection.domain.AvisClient;
import ma.recrutement.selection.domain.Candidature;
import ma.recrutement.selection.domain.Etape;

public final class Dtos {

    private Dtos() {
    }

    public record AjoutRequest(@NotNull UUID missionId, @NotNull UUID candidatId) {
    }

    public record EtapeRequest(@NotNull Etape etape, String motif, BigDecimal salaireAnnuel, LocalDate dateEmbauche) {
    }

    public record EvaluationRequest(@Min(1) @Max(5) Integer noteGlobale, String synthese) {
    }

    public record ShortlistRequest(@NotNull UUID missionId, @NotEmpty List<UUID> candidatureIds) {
    }

    public record AvisRequest(@NotNull AvisClient avis, String commentaire) {
    }

    /** Vue recruteur d'une candidature (carte du pipeline). */
    public record CandidatureDto(UUID id, UUID missionId, String missionIntitule, UUID entrepriseId,
                                 String entrepriseNom, UUID candidatId, String candidatNom, String candidatEmail,
                                 String candidatTitre, int candidatExperience, String candidatVille,
                                 List<String> competences, String candidatDisponibilite,
                                 BigDecimal candidatPretention, Etape etape, String etapeLibelle, int score,
                                 String motifSortie, Integer noteGlobale, String synthese, AvisClient avisClient,
                                 String commentaireClient, OffsetDateTime presenteLe, OffsetDateTime updatedAt,
                                 EvaluationEntretienDto evaluationEntretien) {
        public static CandidatureDto of(Candidature c) {
            return new CandidatureDto(c.getId(), c.getMissionId(), c.getMissionIntitule(), c.getEntrepriseId(),
                    c.getEntrepriseNom(), c.getCandidatId(), c.getCandidatNom(), c.getCandidatEmail(),
                    c.getCandidatTitre(), c.getCandidatExperience(), c.getCandidatVille(),
                    Dtos.competences(c.getCandidatCompetences()), c.getCandidatDisponibilite(), c.getCandidatPretention(),
                    c.getEtape(), c.getEtape().libelle(), c.getScore(), c.getMotifSortie(), c.getNoteGlobale(),
                    c.getSynthese(), c.getAvisClient(), c.getCommentaireClient(), c.getPresenteLe(),
                    c.getUpdatedAt(), EvaluationEntretienDto.of(c));
        }
    }

    /** Ce que voit le client : profil, avis du recruteur, sa propre décision. Pas de coordonnées. */
    public record ProfilPresenteDto(UUID candidatureId, UUID missionId, String missionIntitule, String candidatNom,
                                    String candidatTitre, int candidatExperience, String candidatVille,
                                    List<String> competences, String candidatDisponibilite,
                                    BigDecimal candidatPretention, Integer noteGlobale, String synthese,
                                    Etape etape, String etapeLibelle, AvisClient avisClient,
                                    String commentaireClient, OffsetDateTime presenteLe,
                                    EvaluationEntretienDto evaluationEntretien) {
        public static ProfilPresenteDto of(Candidature c) {
            return new ProfilPresenteDto(c.getId(), c.getMissionId(), c.getMissionIntitule(), c.getCandidatNom(),
                    c.getCandidatTitre(), c.getCandidatExperience(), c.getCandidatVille(),
                    Dtos.competences(c.getCandidatCompetences()), c.getCandidatDisponibilite(), c.getCandidatPretention(),
                    c.getNoteGlobale(), c.getSynthese(), c.getEtape(), c.getEtape().libelle(), c.getAvisClient(),
                    c.getCommentaireClient(), c.getPresenteLe(), EvaluationEntretienDto.of(c));
        }
    }

    /** Grille remplie par le client après l'entretien (reçue d'agenda-service), null s'il n'y en a pas. */
    public record EvaluationEntretienDto(Integer technique, Integer communication, Integer motivation,
                                         Integer adequationEquipe, String decision) {
        static EvaluationEntretienDto of(Candidature c) {
            return c.getEvalDecision() == null ? null : new EvaluationEntretienDto(c.getEvalTechnique(),
                    c.getEvalCommunication(), c.getEvalMotivation(), c.getEvalEquipe(), c.getEvalDecision());
        }
    }

    /** Ce que voit le candidat : l'entreprise reste confidentielle jusqu'à la présentation. */
    public record MaCandidatureDto(UUID id, String missionIntitule, String entreprise, Etape etape,
                                   String etapeLibelle, int etapeNumero, int etapesTotal, OffsetDateTime updatedAt) {
        public static MaCandidatureDto of(Candidature c) {
            String entreprise = c.getEtape().visibleDuClient() ? c.getEntrepriseNom() : "Entreprise confidentielle";
            int numero = c.getEtape().estSortie() ? 0 : Math.min(c.getEtape().ordinal() + 1, 7);
            return new MaCandidatureDto(c.getId(), c.getMissionIntitule(), entreprise, c.getEtape(),
                    c.getEtape().libelle(), numero, 7, c.getUpdatedAt());
        }
    }

    /** Ce dont agenda-service a besoin pour organiser une réunion sur une candidature. */
    public record ContexteReunionDto(UUID candidatureId, UUID missionId, String missionIntitule, UUID entrepriseId,
                                     String entrepriseNom, String contactEmail, UUID candidatId, String candidatNom,
                                     String candidatEmail, Etape etape) {
        public static ContexteReunionDto of(Candidature c) {
            return new ContexteReunionDto(c.getId(), c.getMissionId(), c.getMissionIntitule(), c.getEntrepriseId(),
                    c.getEntrepriseNom(), c.getContactEmail(), c.getCandidatId(), c.getCandidatNom(),
                    c.getCandidatEmail(), c.getEtape());
        }
    }

    public record SuggestionDto(UUID candidatId, String nomComplet, String titre, int anneesExperience,
                                String ville, List<String> competences, String disponibilite, int score) {
    }

    public record ColonneDto(Etape etape, String libelle, List<CandidatureDto> candidatures) {
    }

    public record PipelineDto(UUID missionId, List<ColonneDto> colonnes, List<CandidatureDto> sorties) {
    }

    public record MissionResumeDto(UUID missionId, long sources, long presentes, long enCours, long aEvaluer,
                                   long places) {
    }

    public record EtapeEntonnoir(Etape etape, String libelle, long nombre) {
    }

    public record SelectionStats(List<EtapeEntonnoir> entonnoir, long placements, double tauxPresentesPlaces,
                                 Double delaiMoyenPlacementJours, Double delaiMoyenShortlistJours,
                                 long entretiensAVenir, long retoursEnAttente,
                                 List<CandidatureDto> derniersRetours) {
    }

    static List<String> competences(String valeur) {
        return valeur == null || valeur.isBlank() ? List.of()
                : Arrays.stream(valeur.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
