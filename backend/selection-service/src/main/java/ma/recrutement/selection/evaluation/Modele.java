package ma.recrutement.selection.evaluation;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Modèle de test en ligne (TEST) ou de grille d'entretien (GRILLE), avec ses règles de passage. */
@Entity
@Table(name = "eval_modele")
@Getter
@Setter
public class Modele {

    public static final String TEST = "TEST";
    public static final String GRILLE = "GRILLE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String mode = TEST;

    @Column(nullable = false)
    private String intitule;

    /** Compétences visées, séparées par des virgules. */
    private String competences;
    private Integer dureeMinutes;
    private int seuil = 70;
    private int delaiJours = 5;
    private boolean melanger = true;
    private boolean indices;
    private boolean scoreVisible = true;
    private boolean pleinEcran = true;
    private boolean signaux = true;
    private int alerteSorties = 2;
    private int alerteSecondes = 15;
    private String auteur;
    private int utilisations;
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
