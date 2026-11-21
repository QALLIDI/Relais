package ma.recrutement.selection.evaluation;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationQuestionRepository extends JpaRepository<EvaluationQuestion, UUID> {

    List<EvaluationQuestion> findByEvaluationIdOrderByOrdre(UUID evaluationId);
}
