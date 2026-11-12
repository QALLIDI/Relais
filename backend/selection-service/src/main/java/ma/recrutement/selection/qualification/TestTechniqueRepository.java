package ma.recrutement.selection.qualification;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TestTechniqueRepository extends JpaRepository<TestTechnique, UUID> {

    List<TestTechnique> findByCandidatureIdOrderByEnvoyeLeDesc(UUID candidatureId);
}
