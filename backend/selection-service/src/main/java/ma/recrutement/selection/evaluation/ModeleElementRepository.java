package ma.recrutement.selection.evaluation;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ModeleElementRepository extends JpaRepository<ModeleElement, UUID> {

    List<ModeleElement> findByModeleIdOrderByOrdre(UUID modeleId);

    void deleteByModeleId(UUID modeleId);
}
