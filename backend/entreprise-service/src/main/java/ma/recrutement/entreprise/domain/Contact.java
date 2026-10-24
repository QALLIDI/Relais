package ma.recrutement.entreprise.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "contact")
@Getter
@Setter
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    @Column(nullable = false)
    private String nom;

    private String fonction;

    @Column(nullable = false)
    private String email;

    private String telephone;

    /** Identifiant du compte Keycloak quand le contact a accès à l'espace entreprise. */
    private String keycloakUserId;
}
