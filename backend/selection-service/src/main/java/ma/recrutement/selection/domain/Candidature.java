package ma.recrutement.selection.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Un candidat dans le pipeline d'une mission. Les informations de la mission et du candidat
 * sont copiées à la création pour que le pipeline reste lisible même si un autre service est indisponible.
 */
@Entity
@Table(name = "candidature", uniqueConstraints = @UniqueConstraint(columnNames = {"mission_id", "candidat_id"}))
@Getter
@Setter
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "mission_id", nullable = false)
    private UUID missionId;
    private UUID entrepriseId;
    private String missionIntitule;
    private String entrepriseNom;
    private String contactEmail;

    @Column(name = "candidat_id", nullable = false)
    private UUID candidatId;
    private String candidatNom;
    private String candidatEmail;
    private String candidatTitre;
    private int candidatExperience;
    private String candidatVille;
    private String candidatCompetences;
    private String candidatDisponibilite;
    private BigDecimal candidatPretention;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Etape etape = Etape.SOURCE;

    /** Étape la plus avancée jamais atteinte : sert à l'entonnoir de conversion. */
    @Enumerated(EnumType.STRING)
    private Etape etapeMax = Etape.SOURCE;

    private int score;
    private String motifSortie;

    private Integer noteGlobale;
    @Column(columnDefinition = "text")
    private String synthese;

    @Enumerated(EnumType.STRING)
    private AvisClient avisClient;
    @Column(columnDefinition = "text")
    private String commentaireClient;

    private OffsetDateTime presenteLe;
    private OffsetDateTime placeLe;
    private LocalDate dateEmbauche;
    private BigDecimal salaireAnnuel;

    private OffsetDateTime createdAt = OffsetDateTime.now();
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public void passerA(Etape nouvelle) {
        this.etape = nouvelle;
        if (!nouvelle.estSortie() && nouvelle.ordinal() > etapeMax.ordinal()) {
            this.etapeMax = nouvelle;
        }
        if (nouvelle == Etape.PRESENTE && presenteLe == null) {
            presenteLe = OffsetDateTime.now();
        }
        if (nouvelle == Etape.PLACE && placeLe == null) {
            placeLe = OffsetDateTime.now();
        }
        this.updatedAt = OffsetDateTime.now();
    }
}
