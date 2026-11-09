package ma.recrutement.candidat.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import ma.recrutement.candidat.domain.Candidat;
import ma.recrutement.candidat.domain.Disponibilite;
import ma.recrutement.candidat.domain.Experience;
import ma.recrutement.candidat.domain.Niveau;
import ma.recrutement.candidat.domain.Note;

public final class Dtos {

    private Dtos() {
    }

    public record ExperienceDto(String periode, String poste, String employeur, String description) {
        static ExperienceDto of(Experience e) {
            return new ExperienceDto(e.getPeriode(), e.getPoste(), e.getEmployeur(), e.getDescription());
        }

        public Experience toEntityPublic() {
            Experience e = new Experience();
            e.setPeriode(periode);
            e.setPoste(poste);
            e.setEmployeur(employeur);
            e.setDescription(description);
            return e;
        }
    }

    public record CandidatRequest(@NotBlank String nomComplet, String email, String telephone, String titre,
                                  @Min(0) int anneesExperience, String secteur, String ville, String mobilite,
                                  Disponibilite disponibilite, BigDecimal pretentionSalaire, String langues,
                                  String source, List<String> competences, List<ExperienceDto> experiences,
                                  Boolean consentement) {
    }

    /** Fiche complète, réservée au recruteur et au candidat lui-même. */
    public record CandidatDto(UUID id, String nomComplet, String email, String telephone, String titre,
                              int anneesExperience, Niveau niveau, String niveauLibelle, String secteur,
                              String ville, String mobilite, Disponibilite disponibilite,
                              String disponibiliteLibelle, BigDecimal pretentionSalaire, String langues,
                              String source, List<String> competences, List<ExperienceDto> experiences,
                              LocalDate consentementLe, boolean cvDisponible, String cvNomFichier,
                              OffsetDateTime createdAt, boolean consentementVivier, boolean consentementActualites) {
        public static CandidatDto of(Candidat c) {
            return new CandidatDto(c.getId(), c.getNomComplet(), c.getEmail(), c.getTelephone(), c.getTitre(),
                    c.getAnneesExperience(), c.getNiveau(), c.getNiveau() == null ? null : c.getNiveau().libelle(),
                    c.getSecteur(), c.getVille(), c.getMobilite(), c.getDisponibilite(),
                    c.getDisponibilite() == null ? null : c.getDisponibilite().libelle(), c.getPretentionSalaire(),
                    c.getLangues(), c.getSource(), List.copyOf(c.getCompetences()),
                    c.getExperiences().stream().map(ExperienceDto::of).toList(), c.getConsentementLe(),
                    c.getCvObjectKey() != null, c.getCvNomFichier(), c.getCreatedAt(), c.isConsentementVivier(),
                    c.isConsentementActualites());
        }
    }

    /** Choix du candidat sur la page « Mes données » ; un champ absent n'est pas modifié. */
    public record ConsentementsRequest(Boolean presentation, Boolean vivier, Boolean actualites) {
    }

    /** Résumé sans coordonnées : ce que voient la shortlist côté client et le pipeline. */
    public record CandidatResume(UUID id, String nomComplet, String titre, int anneesExperience, Niveau niveau,
                                 String ville, String secteur, Disponibilite disponibilite,
                                 String disponibiliteLibelle, BigDecimal pretentionSalaire,
                                 List<String> competences, String email) {
        public static CandidatResume of(Candidat c, boolean avecEmail) {
            return new CandidatResume(c.getId(), c.getNomComplet(), c.getTitre(), c.getAnneesExperience(),
                    c.getNiveau(), c.getVille(), c.getSecteur(), c.getDisponibilite(),
                    c.getDisponibilite() == null ? null : c.getDisponibilite().libelle(), c.getPretentionSalaire(),
                    List.copyOf(c.getCompetences()), avecEmail ? c.getEmail() : null);
        }
    }

    public record Groupe(String cle, String libelle, long nombre, List<CandidatResume> candidats) {
    }

    public record NoteRequest(@NotBlank String texte) {
    }

    public record NoteDto(UUID id, String auteur, String texte, OffsetDateTime createdAt) {
        public static NoteDto of(Note n) {
            return new NoteDto(n.getId(), n.getAuteur(), n.getTexte(), n.getCreatedAt());
        }
    }

    public record VivierStats(long total, long ajoutesCeMois, Map<String, Long> parSource,
                              Map<String, Long> parNiveau, Map<String, Long> parDisponibilite) {
    }
}
