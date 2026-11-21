package ma.recrutement.selection.evaluation;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ModeleRepository extends JpaRepository<Modele, UUID> {

    List<Modele> findAllByOrderByModeAscIntituleAsc();
}
