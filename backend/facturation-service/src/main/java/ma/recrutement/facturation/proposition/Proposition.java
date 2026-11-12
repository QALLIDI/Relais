package ma.recrutement.facturation.proposition;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Proposition commerciale : la formule devient le contrat de l'entreprise quand le client l'accepte. */
@Entity
@Table(name = "proposition")
@Getter
@Setter
public class Proposition {

    public static final String ENVOYEE = "ENVOYEE";
    public static final String ACCEPTEE = "ACCEPTEE";
    public static final String REFUSEE = "REFUSEE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID entrepriseId;

    @Column(nullable = false)
    private String entrepriseNom;

    private String contactEmail;
    private String poste;

    /** SUCCES, FORFAIT ou ABONNEMENT. */
    @Column(nullable = false)
    private String formule;

    private BigDecimal taux;
    private BigDecimal montant;
    private int acomptePct;
    private int garantieMois;

    @Column(nullable = false)
    private String statut = ENVOYEE;

    private String motifRefus;
    private OffsetDateTime envoyeeLe = OffsetDateTime.now();
    @Column(name = "repondue_le")
    private OffsetDateTime reponduLe;
}
