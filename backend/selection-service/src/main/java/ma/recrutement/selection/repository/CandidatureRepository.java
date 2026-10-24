package ma.recrutement.selection.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import ma.recrutement.selection.domain.Candidature;
import ma.recrutement.selection.domain.Etape;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidatureRepository extends JpaRepository<Candidature, UUID> {

    List<Candidature> findByMissionIdOrderByScoreDesc(UUID missionId);

    List<Candidature> findByCandidatIdOrderByUpdatedAtDesc(UUID candidatId);

    List<Candidature> findByCandidatEmailIgnoreCaseOrderByUpdatedAtDesc(String email);

    List<Candidature> findByEntrepriseIdAndEtapeInOrderByPresenteLeDesc(UUID entrepriseId, Collection<Etape> etapes);

    List<Candidature> findByEtapeNotInOrderByUpdatedAtDesc(Collection<Etape> etapes);

    List<Candidature> findTop10ByAvisClientIsNotNullOrderByUpdatedAtDesc();

    boolean existsByMissionIdAndCandidatId(UUID missionId, UUID candidatId);
}
