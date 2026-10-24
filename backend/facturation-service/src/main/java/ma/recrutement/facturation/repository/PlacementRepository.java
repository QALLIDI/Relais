package ma.recrutement.facturation.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.facturation.domain.Placement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlacementRepository extends JpaRepository<Placement, UUID> {
    boolean existsByCandidatureId(UUID candidatureId);

    List<Placement> findAllByOrderByCreatedAtDesc();
}
