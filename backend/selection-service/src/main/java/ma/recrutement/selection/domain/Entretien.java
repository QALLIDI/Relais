package ma.recrutement.selection.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "entretien")
@Getter
@Setter
public class Entretien {

    public enum Type { PREQUALIFICATION, RECRUTEUR, CLIENT }

    public enum Statut { PROPOSE, CONFIRME, ANNULE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "candidature_id")
    private Candidature candidature;

    @Column(nullable = false)
    private OffsetDateTime dateHeure;

    @Enumerated(EnumType.STRING)
    private Type type = Type.CLIENT;

    private String lieu;

    @Enumerated(EnumType.STRING)
    private Statut statut = Statut.PROPOSE;

    @Column(columnDefinition = "text")
    private String compteRendu;

    private OffsetDateTime createdAt = OffsetDateTime.now();
}
