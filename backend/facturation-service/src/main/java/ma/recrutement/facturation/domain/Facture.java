package ma.recrutement.facturation.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "facture")
@Getter
@Setter
public class Facture {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Attribué à l'émission (F-2026-001) ; null tant que la facture est un brouillon. */
    @Column(unique = true)
    private String numero;

    @Column(nullable = false)
    private UUID entrepriseId;
    private String entrepriseNom;
    private String contactEmail;

    @Column(nullable = false)
    private String objet;

    private UUID placementId;

    private BigDecimal montantHt;
    private BigDecimal tauxTva;
    private BigDecimal montantTva;
    private BigDecimal montantTtc;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutFacture statut = StatutFacture.BROUILLON;

    private LocalDate dateEmission;
    private LocalDate echeance;
    private LocalDate datePaiement;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    public boolean enRetard() {
        return statut == StatutFacture.EMISE && echeance != null && echeance.isBefore(LocalDate.now());
    }
}
