package ma.recrutement.agenda.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import ma.recrutement.agenda.domain.Enums.Statut;
import ma.recrutement.agenda.domain.Reunion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReunionRepository extends JpaRepository<Reunion, UUID> {

    List<Reunion> findByEntrepriseId(UUID entrepriseId);

    List<Reunion> findByCandidatEmailIgnoreCase(String email);

    List<Reunion> findByStatutAndDebutBetween(Statut statut, OffsetDateTime apres, OffsetDateTime avant);

    List<Reunion> findByStatutAndFinBefore(Statut statut, OffsetDateTime avant);

    Optional<Reunion> findFirstByCandidatureIdAndStatutIn(UUID candidatureId, Collection<Statut> statuts);

    boolean existsByCandidatureIdAndStatutIn(UUID candidatureId, Collection<Statut> statuts);
}
