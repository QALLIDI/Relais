package ma.recrutement.selection.qualification;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Test technique envoyé au candidat (plateforme externe) ; le recruteur saisit le score à la correction. */
@Entity
@Table(name = "test_technique")
@Getter
@Setter
public class TestTechnique {

    public static final String ENVOYE = "ENVOYE";
    public static final String CORRIGE = "CORRIGE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID candidatureId;

    @Column(nullable = false)
    private String intitule;

    private Integer dureeMinutes;
    private String lien;

    @Column(columnDefinition = "text")
    private String message;

    private LocalDate dateLimite;

    @Column(nullable = false)
    private String statut = ENVOYE;

    private Integer score;

    @Column(columnDefinition = "text")
    private String commentaire;

    private OffsetDateTime envoyeLe = OffsetDateTime.now();
    private OffsetDateTime corrigeLe;
}
