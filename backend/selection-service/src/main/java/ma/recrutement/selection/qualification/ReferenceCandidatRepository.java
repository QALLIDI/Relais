package ma.recrutement.selection.qualification;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferenceCandidatRepository extends JpaRepository<ReferenceCandidat, UUID> {

    List<ReferenceCandidat> findByCandidatureIdOrderByDemandeeLeAsc(UUID candidatureId);
}
