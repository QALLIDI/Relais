package ma.recrutement.notification.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Notification in-app ; un e-mail est envoyé en parallèle quand une adresse est connue. */
@Entity
@Table(name = "notification")
@Getter
@Setter
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Adresse e-mail du destinataire (recruteur, contact client ou candidat). */
    @Column(nullable = false)
    private String destinataire;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "text")
    private String message;

    /** Événement d'origine, ex. shortlist.envoyee. */
    private String type;

    private boolean lu;
    private boolean emailEnvoye;

    private OffsetDateTime createdAt = OffsetDateTime.now();
}
