package ma.recrutement.selection.evaluation;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Élément d'un modèle : une question fixe (questionId), un tirage au hasard (compétence, niveau facultatif,
 * nombre), ou un critère de grille (libellé, questions guides une par ligne, poids).
 */
@Entity
@Table(name = "eval_modele_element")
@Getter
@Setter
public class ModeleElement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID modeleId;

    private int ordre;
    private UUID questionId;
    private String competence;
    private String niveau;
    private Integer nombre;
    private String libelle;

    @Column(columnDefinition = "text")
    private String guides;

    private Integer poids;
}
