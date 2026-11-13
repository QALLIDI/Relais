package ma.recrutement.entreprise.messagerie;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureMessageRepository extends JpaRepository<LectureMessage, UUID> {

    Optional<LectureMessage> findByMissionIdAndUtilisateurId(UUID missionId, String utilisateurId);
}
