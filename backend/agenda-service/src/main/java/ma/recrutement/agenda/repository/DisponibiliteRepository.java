package ma.recrutement.agenda.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.agenda.domain.Disponibilite;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisponibiliteRepository extends JpaRepository<Disponibilite, UUID> {

    List<Disponibilite> findByEntrepriseIdOrderByJourAscHeureDebutAsc(UUID entrepriseId);

    void deleteByEntrepriseId(UUID entrepriseId);
}
