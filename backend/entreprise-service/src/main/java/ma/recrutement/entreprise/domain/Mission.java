package ma.recrutement.entreprise.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "mission")
@Getter
@Setter
public class Mission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    @Column(nullable = false)
    private String intitule;

    @Column(columnDefinition = "text")
    private String description;

    private String typeContrat;
    private String ville;
    private String teletravail;
    private Integer nbPostes = 1;

    /** Années d'expérience minimum. */
    private Integer experienceMin;

    private BigDecimal salaireMin;
    private BigDecimal salaireMax;
    private LocalDate dateLimite;
    private String priorite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutMission statut = StatutMission.BROUILLON;

    @ElementCollection
    @CollectionTable(name = "mission_competence", joinColumns = @JoinColumn(name = "mission_id"))
    @Column(name = "competence")
    private List<String> competencesRequises = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "mission_competence_souhaitee", joinColumns = @JoinColumn(name = "mission_id"))
    @Column(name = "competence")
    private List<String> competencesSouhaitees = new ArrayList<>();

    private boolean ouvertureNotifiee;

    private OffsetDateTime createdAt = OffsetDateTime.now();
}
