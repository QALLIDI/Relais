package ma.recrutement.agenda.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Créneau proposé au candidat, en UTC. */
@Entity
@Table(name = "creneau")
@Getter
@Setter
public class Creneau {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reunion_id")
    private Reunion reunion;

    @Column(nullable = false)
    private OffsetDateTime debut;

    @Column(nullable = false)
    private OffsetDateTime fin;

    private boolean choisi;
}
