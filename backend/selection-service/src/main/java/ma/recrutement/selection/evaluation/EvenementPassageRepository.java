package ma.recrutement.selection.evaluation;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EvenementPassageRepository extends JpaRepository<EvenementPassage, UUID> {

    List<EvenementPassage> findByEvaluationIdOrderByDebut(UUID evaluationId);
}
