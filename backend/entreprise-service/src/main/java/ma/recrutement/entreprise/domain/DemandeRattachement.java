package ma.recrutement.entreprise.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Compte entreprise inscrit en ligne qui attend que le recruteur le rattache à une entreprise. */
@Entity
@Table(name = "demande_rattachement")
@Getter
@Setter
public class DemandeRattachement {

    public static final String EN_ATTENTE = "EN_ATTENTE";
    public static final String RATTACHEE = "RATTACHEE";
    public static final String REFUSEE = "REFUSEE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String keycloakUserId;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String email;

    private String telephone;

    /** Raison sociale saisie à l'inscription, pour retrouver (ou créer) l'entreprise. */
    private String raisonSociale;

    @Column(nullable = false)
    private String statut = EN_ATTENTE;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    /** Entreprise à laquelle le compte a été rattaché (statut RATTACHEE). */
    private UUID entrepriseId;

    private OffsetDateTime traiteeLe;
}
