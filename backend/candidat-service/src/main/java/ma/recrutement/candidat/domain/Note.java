package ma.recrutement.candidat.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Note privée du recruteur sur un candidat. */
@Entity
@Table(name = "note")
@Getter
@Setter
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID candidatId;

    private String auteur;

    @Column(columnDefinition = "text", nullable = false)
    private String texte;

    private OffsetDateTime createdAt = OffsetDateTime.now();
}
