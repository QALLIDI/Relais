package ma.recrutement.selection.qualification;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Référence demandée à un ancien manager, collègue ou client du candidat, avec son accord. */
@Entity
@Table(name = "reference_candidat")
@Getter
@Setter
public class ReferenceCandidat {

    public static final String DEMANDEE = "DEMANDEE";
    public static final String RECUE = "RECUE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID candidatureId;

    @Column(nullable = false)
    private String nom;

    private String email;
    private String telephone;
    private String fonction;

    /** MANAGER, COLLEGUE ou CLIENT. */
    @Column(nullable = false)
    private String lien;

    @Column(nullable = false)
    private String statut = DEMANDEE;

    @Column(columnDefinition = "text")
    private String avis;

    private Boolean recommande;

    private OffsetDateTime demandeeLe = OffsetDateTime.now();
    private OffsetDateTime relanceeLe;
    private OffsetDateTime recueLe;
}
