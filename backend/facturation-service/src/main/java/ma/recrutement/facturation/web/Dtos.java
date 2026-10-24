package ma.recrutement.facturation.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import ma.recrutement.facturation.domain.Facture;
import ma.recrutement.facturation.domain.Placement;

public final class Dtos {

    private Dtos() {
    }

    public record FactureDto(UUID id, String numero, UUID entrepriseId, String entrepriseNom, String objet,
                             UUID placementId, BigDecimal montantHt, BigDecimal montantTva, BigDecimal montantTtc,
                             String statut, LocalDate dateEmission, LocalDate echeance, LocalDate datePaiement) {
        public static FactureDto of(Facture f) {
            String statut = f.enRetard() ? "EN_RETARD" : f.getStatut().name();
            return new FactureDto(f.getId(), f.getNumero(), f.getEntrepriseId(), f.getEntrepriseNom(), f.getObjet(),
                    f.getPlacementId(), f.getMontantHt(), f.getMontantTva(), f.getMontantTtc(), statut,
                    f.getDateEmission(), f.getEcheance(), f.getDatePaiement());
        }
    }

    public record FactureRequest(@NotNull UUID entrepriseId, @NotBlank String entrepriseNom, String contactEmail,
                                 @NotBlank String objet, @NotNull @Positive BigDecimal montantHt) {
    }

    public record PlacementDto(UUID id, UUID candidatureId, String entrepriseNom, String missionIntitule,
                               String candidatNom, BigDecimal salaireAnnuel, BigDecimal tauxHonoraires,
                               LocalDate dateEmbauche, LocalDate finGarantie) {
        public static PlacementDto of(Placement p) {
            return new PlacementDto(p.getId(), p.getCandidatureId(), p.getEntrepriseNom(), p.getMissionIntitule(),
                    p.getCandidatNom(), p.getSalaireAnnuel(), p.getTauxHonoraires(), p.getDateEmbauche(),
                    p.getFinGarantie());
        }
    }

    public record MoisMontant(String mois, BigDecimal montant) {
    }

    public record ClientMontant(String entreprise, long placements, BigDecimal montantHt) {
    }

    public record FacturationStats(BigDecimal factureCeMois, BigDecimal encaisseCeMois, BigDecimal enAttente,
                                   BigDecimal enRetard, long placements, List<MoisMontant> encaisseParMois,
                                   List<ClientMontant> parClient) {
    }
}
