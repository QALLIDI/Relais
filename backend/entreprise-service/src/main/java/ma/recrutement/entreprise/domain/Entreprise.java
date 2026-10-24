package ma.recrutement.entreprise.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "entreprise")
@Getter
@Setter
public class Entreprise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String raisonSociale;

    private String ice;
    private String secteur;
    private String ville;
    private String taille;

    /** Pourcentage du salaire annuel brut facturé au placement (ex. 15.00). */
    private BigDecimal tauxHonoraires;

    @Enumerated(EnumType.STRING)
    private ModeleTarif modeleTarif = ModeleTarif.POURCENTAGE;

    /** Forfait facturé à l'ouverture d'une mission, déduit du solde au placement. */
    private BigDecimal acompte;

    @OneToMany(mappedBy = "entreprise", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("nom")
    private List<Contact> contacts = new ArrayList<>();

    private OffsetDateTime createdAt = OffsetDateTime.now();

    public String contactPrincipalEmail() {
        return contacts.isEmpty() ? null : contacts.getFirst().getEmail();
    }
}
