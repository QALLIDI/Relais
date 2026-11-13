package ma.recrutement.entreprise.messagerie;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Dernière lecture du fil d'une mission par un utilisateur : les messages postérieurs sont « non lus ». */
@Entity
@Table(name = "lecture_message")
@Getter
@Setter
public class LectureMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID missionId;

    @Column(nullable = false)
    private String utilisateurId;

    @Column(nullable = false)
    private OffsetDateTime luLe;
}
