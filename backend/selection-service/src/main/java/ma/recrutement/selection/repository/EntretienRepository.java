package ma.recrutement.selection.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import ma.recrutement.selection.domain.Entretien;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EntretienRepository extends JpaRepository<Entretien, UUID> {

    List<Entretien> findByDateHeureAfterOrderByDateHeureAsc(OffsetDateTime apres);

    List<Entretien> findByCandidatureEntrepriseIdAndDateHeureAfterOrderByDateHeureAsc(UUID entrepriseId, OffsetDateTime apres);

    List<Entretien> findByCandidatureCandidatEmailIgnoreCaseAndDateHeureAfterOrderByDateHeureAsc(String email, OffsetDateTime apres);
}
