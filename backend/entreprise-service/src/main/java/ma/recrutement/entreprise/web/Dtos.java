package ma.recrutement.entreprise.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.recrutement.entreprise.domain.Contact;
import ma.recrutement.entreprise.domain.DemandeRattachement;
import ma.recrutement.entreprise.domain.Entreprise;
import ma.recrutement.entreprise.domain.Mission;
import ma.recrutement.entreprise.domain.ModeleTarif;
import ma.recrutement.entreprise.domain.StatutMission;

public final class Dtos {

    private Dtos() {
    }

    public record ContactDto(UUID id, @NotBlank String nom, String fonction, @NotBlank @Email String email,
                             String telephone) {
        public static ContactDto of(Contact c) {
            return new ContactDto(c.getId(), c.getNom(), c.getFonction(), c.getEmail(), c.getTelephone());
        }
    }

    public record DemandeRattachementDto(UUID id, String nom, String email, String telephone, String raisonSociale,
                                         OffsetDateTime createdAt, String keycloakUserId) {
        public static DemandeRattachementDto of(DemandeRattachement d) {
            return new DemandeRattachementDto(d.getId(), d.getNom(), d.getEmail(), d.getTelephone(),
                    d.getRaisonSociale(), d.getCreatedAt(), d.getKeycloakUserId());
        }
    }

    public record EntrepriseRequest(@NotBlank String raisonSociale, String ice, String secteur, String ville,
                                    String taille, BigDecimal tauxHonoraires, ModeleTarif modeleTarif,
                                    BigDecimal acompte, List<ContactDto> contacts) {
    }

    public record EntrepriseDto(UUID id, String raisonSociale, String ice, String secteur, String ville,
                                String taille, BigDecimal tauxHonoraires, ModeleTarif modeleTarif,
                                BigDecimal acompte, List<ContactDto> contacts, long missionsOuvertes) {
        public static EntrepriseDto of(Entreprise e, long missionsOuvertes) {
            return new EntrepriseDto(e.getId(), e.getRaisonSociale(), e.getIce(), e.getSecteur(), e.getVille(),
                    e.getTaille(), e.getTauxHonoraires(), e.getModeleTarif(), e.getAcompte(),
                    e.getContacts().stream().map(ContactDto::of).toList(), missionsOuvertes);
        }
    }

    public record MissionRequest(UUID entrepriseId, @NotBlank String intitule, String description,
                                 String typeContrat, String ville, String teletravail, Integer nbPostes,
                                 Integer experienceMin, BigDecimal salaireMin, BigDecimal salaireMax,
                                 LocalDate dateLimite, String priorite, List<String> competencesRequises,
                                 List<String> competencesSouhaitees, StatutMission statut, Boolean confidentiel) {
    }

    public record StatutRequest(@NotNull StatutMission statut, @Size(max = 500) String motif) {
    }

    /** Vue complète d'une mission ; tauxHonoraires sert à la facturation au placement. */
    public record MissionDto(UUID id, UUID entrepriseId, String entrepriseNom, String entrepriseSecteur,
                             String contactEmail, BigDecimal tauxHonoraires, String intitule,
                             String description, String typeContrat, String ville, String teletravail,
                             Integer nbPostes, Integer experienceMin, BigDecimal salaireMin,
                             BigDecimal salaireMax, LocalDate dateLimite, String priorite,
                             StatutMission statut, List<String> competencesRequises,
                             List<String> competencesSouhaitees, OffsetDateTime createdAt, boolean confidentiel,
                             String motifAnnulation) {
        public static MissionDto of(Mission m) {
            Entreprise e = m.getEntreprise();
            return new MissionDto(m.getId(), e.getId(), e.getRaisonSociale(), e.getSecteur(),
                    e.contactPrincipalEmail(), e.getTauxHonoraires(), m.getIntitule(), m.getDescription(),
                    m.getTypeContrat(), m.getVille(), m.getTeletravail(), m.getNbPostes(), m.getExperienceMin(),
                    m.getSalaireMin(), m.getSalaireMax(), m.getDateLimite(), m.getPriorite(), m.getStatut(),
                    List.copyOf(m.getCompetencesRequises()), List.copyOf(m.getCompetencesSouhaitees()),
                    m.getCreatedAt(), m.isConfidentiel(), m.getMotifAnnulation());
        }
    }

    public record CompetenceCount(String competence, long missions) {
    }

    public record MissionStats(Map<StatutMission, Long> parStatut, List<CompetenceCount> competencesDemandees,
                               long entreprisesClientes) {
    }
}
