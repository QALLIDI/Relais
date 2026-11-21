package ma.recrutement.selection.evaluation;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Test ou grille envoyé pour une candidature. Les règles du modèle sont recopiées à l'envoi. */
@Entity
@Table(name = "evaluation")
@Getter
@Setter
public class Evaluation {

    public static final String ENVOYEE = "ENVOYEE";
    public static final String COMMENCEE = "COMMENCEE";
    public static final String A_CORRIGER = "A_CORRIGER";
    public static final String CORRIGEE = "CORRIGEE";
    public static final String EXPIREE = "EXPIREE";
    /** Grille d'entretien ouverte, en cours de notation. */
    public static final String EN_COURS = "EN_COURS";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID candidatureId;
    private UUID modeleId;

    @Column(nullable = false)
    private String mode;

    @Column(nullable = false)
    private String intitule;

    @Column(nullable = false)
    private String statut = ENVOYEE;

    private Integer dureeMinutes;
    private int seuil;
    private boolean indices;
    private boolean scoreVisible;
    private boolean pleinEcran;
    private boolean signaux;
    private int alerteSorties;
    private int alerteSecondes;

    @Column(columnDefinition = "text")
    private String message;

    private LocalDate dateLimite;
    private OffsetDateTime envoyeeLe = OffsetDateTime.now();
    private OffsetDateTime debut;
    private OffsetDateTime fin;
    private Integer score;

    /** « Java:88;SQL:50 ». */
    private String scoresCompetences;

    @Column(columnDefinition = "text")
    private String commentaire;
}
