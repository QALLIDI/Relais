package ma.recrutement.agenda.domain;

import java.time.LocalTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Plage hebdomadaire où le client accepte des entretiens, en heure locale du Maroc. */
@Entity
@Table(name = "disponibilite")
@Getter
@Setter
public class Disponibilite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID entrepriseId;

    /** 1 = lundi … 7 = dimanche (ISO-8601). */
    private int jour;

    @Column(nullable = false)
    private LocalTime heureDebut;

    @Column(nullable = false)
    private LocalTime heureFin;
}
