package ma.recrutement.agenda.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Grille commune remplie après l'entretien : 4 critères notés de 1 à 5 et une décision. */
@Entity
@Table(name = "evaluation")
@Getter
@Setter
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reunion_id")
    private Reunion reunion;

    private int technique;
    private int communication;
    private int motivation;
    private int adequationEquipe;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Enums.Decision decision;

    @Column(columnDefinition = "text")
    private String commentaire;

    private String auteur;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    public double moyenne() {
        return (technique + communication + motivation + adequationEquipe) / 4.0;
    }
}
