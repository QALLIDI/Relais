package ma.recrutement.facturation.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "placement")
@Getter
@Setter
public class Placement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private UUID candidatureId;

    private UUID missionId;
    private UUID entrepriseId;
    private String entrepriseNom;
    private String missionIntitule;
    private UUID candidatId;
    private String candidatNom;
    private BigDecimal salaireAnnuel;
    private BigDecimal tauxHonoraires;
    private LocalDate dateEmbauche;
    /** Fin de la période pendant laquelle le remplacement est garanti. */
    private LocalDate finGarantie;
    private String contactEmail;

    private OffsetDateTime createdAt = OffsetDateTime.now();
}
