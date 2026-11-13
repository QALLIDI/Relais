package ma.recrutement.entreprise.messagerie;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FilMissionRepository extends JpaRepository<FilMission, UUID> {
}
