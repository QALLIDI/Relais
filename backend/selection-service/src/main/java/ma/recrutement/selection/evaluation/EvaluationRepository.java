package ma.recrutement.selection.evaluation;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {

    List<Evaluation> findByCandidatureIdOrderByEnvoyeeLeDesc(UUID candidatureId);

    List<Evaluation> findByCandidatureIdInOrderByEnvoyeeLeDesc(Collection<UUID> candidatureIds);

    List<Evaluation> findTop100ByOrderByEnvoyeeLeDesc();
}
