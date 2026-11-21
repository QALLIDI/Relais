package ma.recrutement.selection.evaluation;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Signal d'intégrité pendant un test : ONGLET, FENETRE, PLEIN_ECRAN, COPIE, COLLAGE. Jamais bloquant. */
@Entity
@Table(name = "evaluation_evenement")
@Getter
@Setter
public class EvenementPassage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID evaluationId;

    private Integer ordre;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private OffsetDateTime debut;

    private Long dureeMs;
    private Integer longueur;
}
