package ma.recrutement.selection.evaluation;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Question de la banque. Celles de la plateforme ne se modifient pas : le recruteur en fait une copie. */
@Entity
@Table(name = "eval_question")
@Getter
@Setter
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false, columnDefinition = "text")
    private String enonce;

    @Column(columnDefinition = "text")
    private String code;
    private String langage;

    /** Une option par ligne. */
    @Column(columnDefinition = "text")
    private String choix;

    /** Indices des bonnes options (« 0,2 ») ou réponses acceptées (« a|b »). */
    @Column(columnDefinition = "text")
    private String attendues;

    @Column(columnDefinition = "text")
    private String indice;

    @Column(columnDefinition = "text")
    private String explication;

    @Column(nullable = false)
    private String competence;

    @Column(nullable = false)
    private String niveau;

    private int points = 1;
    private boolean plateforme;
    private String auteur;
    private boolean active = true;
    private int utilisations;
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
