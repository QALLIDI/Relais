package ma.recrutement.selection.evaluation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Copie figée d'une question (ou d'un critère de grille) dans une évaluation, avec la réponse. */
@Entity
@Table(name = "evaluation_question")
@Getter
@Setter
public class EvaluationQuestion {

    /** Type d'une ligne de grille d'entretien : un critère noté de 1 à 5 par le recruteur. */
    public static final String CRITERE = "CRITERE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID evaluationId;

    private int ordre;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false, columnDefinition = "text")
    private String enonce;

    @Column(columnDefinition = "text")
    private String code;
    private String langage;

    @Column(columnDefinition = "text")
    private String choix;

    @Column(columnDefinition = "text")
    private String attendues;

    @Column(columnDefinition = "text")
    private String indice;

    @Column(columnDefinition = "text")
    private String explication;

    @Column(nullable = false)
    private String competence;

    private int points;

    @Column(columnDefinition = "text")
    private String reponse;

    private Boolean correcte;
    private BigDecimal pointsObtenus;
    private Long tempsMs;
    private OffsetDateTime reponduLe;
    private boolean aVerifier;
}
