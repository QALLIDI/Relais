package ma.recrutement.entreprise.messagerie;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Message du fil d'une mission, écrit par le recruteur ou par un membre de l'entreprise cliente. */
@Entity
@Table(name = "message_mission")
@Getter
@Setter
public class MessageMission {

    public static final String RECRUTEUR = "RECRUTEUR";
    public static final String ENTREPRISE = "ENTREPRISE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID missionId;

    /** Copie de l'entreprise de la mission, pour compter les non-lus d'un client sans jointure. */
    @Column(nullable = false)
    private UUID entrepriseId;

    /** Identifiant Keycloak de l'auteur. */
    @Column(nullable = false)
    private String auteurId;

    @Column(nullable = false)
    private String auteurNom;

    @Column(nullable = false)
    private String auteurRole;

    @Column(nullable = false, columnDefinition = "text")
    private String contenu;

    @Column(nullable = false)
    private OffsetDateTime creeLe = OffsetDateTime.now();
}
