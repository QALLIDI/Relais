package ma.recrutement.entreprise.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.entreprise.domain.DemandeRattachement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DemandeRattachementRepository extends JpaRepository<DemandeRattachement, UUID> {

    boolean existsByKeycloakUserId(String keycloakUserId);

    List<DemandeRattachement> findByStatutOrderByCreatedAtAsc(String statut);
}
