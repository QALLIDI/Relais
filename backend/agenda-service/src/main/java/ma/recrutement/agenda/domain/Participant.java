package ma.recrutement.agenda.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "participant")
@Getter
@Setter
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reunion_id")
    private Reunion reunion;

    private String nom;
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Enums.Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Enums.Reponse reponse = Enums.Reponse.EN_ATTENTE;

    private boolean facultatif;
}
