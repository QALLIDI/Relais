package ma.recrutement.agenda.web;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.recrutement.agenda.domain.Creneau;
import ma.recrutement.agenda.domain.Disponibilite;
import ma.recrutement.agenda.domain.Enums.Decision;
import ma.recrutement.agenda.domain.Enums.Nature;
import ma.recrutement.agenda.domain.Enums.Reponse;
import ma.recrutement.agenda.domain.Enums.Role;
import ma.recrutement.agenda.domain.Enums.Statut;
import ma.recrutement.agenda.domain.Enums.Type;
import ma.recrutement.agenda.domain.Evaluation;
import ma.recrutement.agenda.domain.Participant;
import ma.recrutement.agenda.domain.Reunion;

public final class Dtos {

    private Dtos() {
    }

    public record ParticipantRequest(@NotBlank String nom, @NotBlank String email, boolean facultatif) {
    }

    /** Création : sans créneau, la réunion reste « à planifier ». */
    public record ReunionRequest(@NotNull UUID candidatureId, Nature nature, Type type,
                                 @Min(15) @Max(240) Integer dureeMinutes, String lieu,
                                 @Size(max = 3) List<OffsetDateTime> creneaux,
                                 @Valid List<ParticipantRequest> participants) {
    }

    /** Nouvelle proposition après un report, ou pour une réunion à planifier. */
    public record PropositionRequest(Type type, @Min(15) @Max(240) Integer dureeMinutes, String lieu,
                                     @NotNull @Size(min = 1, max = 3) List<OffsetDateTime> creneaux) {
    }

    public record ConfirmationRequest(@NotNull UUID creneauId) {
    }

    public record MotifRequest(@NotBlank @Size(max = 500) String motif) {
    }

    public record CompteRenduRequest(@NotBlank String compteRendu) {
    }

    public record EvaluationRequest(@NotNull @Min(1) @Max(5) Integer technique,
                                    @NotNull @Min(1) @Max(5) Integer communication,
                                    @NotNull @Min(1) @Max(5) Integer motivation,
                                    @NotNull @Min(1) @Max(5) Integer adequationEquipe,
                                    @NotNull Decision decision, String commentaire) {
    }

    public record PlageRequest(@Min(1) @Max(7) int jour, @NotNull LocalTime heureDebut, @NotNull LocalTime heureFin) {
    }

    public record CreneauDto(UUID id, OffsetDateTime debut, OffsetDateTime fin, boolean choisi) {
        static CreneauDto of(Creneau c) {
            return new CreneauDto(c.getId(), c.getDebut(), c.getFin(), c.isChoisi());
        }
    }

    /** L'adresse e-mail n'est montrée qu'au recruteur. */
    public record ParticipantDto(String nom, String email, Role role, Reponse reponse, boolean facultatif) {
        static ParticipantDto of(Participant p, boolean avecEmail) {
            return new ParticipantDto(p.getNom(), avecEmail ? p.getEmail() : null, p.getRole(), p.getReponse(),
                    p.isFacultatif());
        }
    }

    public record EvaluationDto(int technique, int communication, int motivation, int adequationEquipe,
                                double moyenne, Decision decision, String commentaire, String auteur,
                                OffsetDateTime createdAt) {
        static EvaluationDto of(Evaluation e) {
            return e == null ? null : new EvaluationDto(e.getTechnique(), e.getCommunication(), e.getMotivation(),
                    e.getAdequationEquipe(), e.moyenne(), e.getDecision(), e.getCommentaire(), e.getAuteur(),
                    e.getCreatedAt());
        }
    }

    public record ReunionDto(UUID id, UUID candidatureId, UUID missionId, String missionIntitule, UUID entrepriseId,
                             String entrepriseNom, String candidatNom, Nature nature, String natureLibelle,
                             Type type, String typeLibelle, int dureeMinutes, Statut statut, String lieu,
                             String lienVisio, OffsetDateTime debut, OffsetDateTime fin, String motif,
                             String compteRendu, List<CreneauDto> creneaux, List<ParticipantDto> participants,
                             EvaluationDto evaluation, OffsetDateTime createdAt, OffsetDateTime updatedAt) {

        /**
         * @param vue RECRUTEUR (tout), CLIENT (sans e-mails ni compte rendu) ou CANDIDAT (ni évaluation,
         *            ni compte rendu, ni nom de l'entreprise hors entretien client)
         */
        public static ReunionDto of(Reunion r, Role vue) {
            boolean recruteur = vue == Role.RECRUTEUR;
            boolean candidat = vue == Role.CANDIDAT;
            String entreprise = candidat && r.getNature() != Nature.ENTRETIEN_CLIENT ? "Entreprise confidentielle"
                    : r.getEntrepriseNom();
            return new ReunionDto(r.getId(), r.getCandidatureId(), r.getMissionId(), r.getMissionIntitule(),
                    r.getEntrepriseId(), entreprise, r.getCandidatNom(), r.getNature(), r.getNature().libelle(),
                    r.getType(), r.getType().libelle(), r.getDureeMinutes(), r.getStatut(), r.getLieu(),
                    r.getLienVisio(), r.getDebut(), r.getFin(), r.getMotif(), recruteur ? r.getCompteRendu() : null,
                    r.getCreneaux().stream().map(CreneauDto::of).toList(),
                    r.getParticipants().stream().map(p -> ParticipantDto.of(p, recruteur)).toList(),
                    candidat ? null : EvaluationDto.of(r.getEvaluation()), r.getCreatedAt(), r.getUpdatedAt());
        }
    }

    public record PlageDto(UUID id, int jour, LocalTime heureDebut, LocalTime heureFin) {
        public static PlageDto of(Disponibilite d) {
            return new PlageDto(d.getId(), d.getJour(), d.getHeureDebut(), d.getHeureFin());
        }
    }
}
