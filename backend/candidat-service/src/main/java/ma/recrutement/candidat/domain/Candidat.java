package ma.recrutement.candidat.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "candidat")
@Getter
@Setter
public class Candidat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Compte Keycloak du candidat quand il gère lui-même son profil. */
    private String keycloakUserId;

    @Column(nullable = false)
    private String nomComplet;

    private String email;
    private String telephone;
    private String titre;
    private int anneesExperience;

    @Enumerated(EnumType.STRING)
    private Niveau niveau;

    private String secteur;
    private String ville;
    private String mobilite;

    @Enumerated(EnumType.STRING)
    private Disponibilite disponibilite = Disponibilite.UN_MOIS;

    private BigDecimal pretentionSalaire;
    private String langues;

    /** LinkedIn, cooptation, candidature spontanée, job board, vivier... */
    private String source;

    @ElementCollection
    @CollectionTable(name = "candidat_competence", joinColumns = @JoinColumn(name = "candidat_id"))
    @Column(name = "competence")
    private List<String> competences = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "candidat_experience", joinColumns = @JoinColumn(name = "candidat_id"))
    @OrderColumn(name = "position")
    private List<Experience> experiences = new ArrayList<>();

    /** Date du consentement loi 09-08 / RGPD ; null = pas de consentement. */
    private LocalDate consentementLe;

    private String cvObjectKey;
    private String cvNomFichier;

    private boolean anonymise;

    private OffsetDateTime createdAt = OffsetDateTime.now();
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PrePersist
    @PreUpdate
    void avantEnregistrement() {
        niveau = Niveau.depuisExperience(anneesExperience);
        updatedAt = OffsetDateTime.now();
    }
}
