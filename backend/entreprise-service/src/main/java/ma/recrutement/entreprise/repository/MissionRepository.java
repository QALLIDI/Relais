package ma.recrutement.entreprise.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.entreprise.domain.Mission;
import ma.recrutement.entreprise.domain.StatutMission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MissionRepository extends JpaRepository<Mission, UUID> {

    List<Mission> findAllByOrderByCreatedAtDesc();

    List<Mission> findByStatutOrderByCreatedAtDesc(StatutMission statut);

    List<Mission> findByEntrepriseIdOrderByCreatedAtDesc(UUID entrepriseId);

    long countByStatut(StatutMission statut);

    @Query("select c, count(m) from Mission m join m.competencesRequises c group by c order by count(m) desc")
    List<Object[]> competencesLesPlusDemandees();
}
