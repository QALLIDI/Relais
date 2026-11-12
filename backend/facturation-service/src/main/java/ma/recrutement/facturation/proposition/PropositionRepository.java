package ma.recrutement.facturation.proposition;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PropositionRepository extends JpaRepository<Proposition, UUID> {

    List<Proposition> findAllByOrderByEnvoyeeLeDesc();

    List<Proposition> findByEntrepriseIdOrderByEnvoyeeLeDesc(UUID entrepriseId);
}
