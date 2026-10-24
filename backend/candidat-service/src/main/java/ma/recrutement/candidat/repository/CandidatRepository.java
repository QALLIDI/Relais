package ma.recrutement.candidat.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import ma.recrutement.candidat.domain.Candidat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface CandidatRepository extends JpaRepository<Candidat, UUID>, JpaSpecificationExecutor<Candidat> {

    Optional<Candidat> findByKeycloakUserId(String keycloakUserId);

    Optional<Candidat> findFirstByEmailIgnoreCase(String email);

    List<Candidat> findByAnonymiseFalse();

    long countByAnonymiseFalse();

    long countByCreatedAtAfterAndAnonymiseFalse(OffsetDateTime date);

    @Query("select coalesce(c.source, 'Non renseignée'), count(c) from Candidat c where c.anonymise = false group by c.source")
    List<Object[]> compterParSource();
}
