package ma.recrutement.selection.evaluation;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, UUID> {

    List<Question> findByActiveTrueOrderByCompetenceAscCreatedAtDesc();

    List<Question> findByActiveTrueAndCompetenceIgnoreCase(String competence);
}
