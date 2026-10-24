package ma.recrutement.facturation.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.facturation.domain.Facture;
import ma.recrutement.facturation.domain.StatutFacture;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FactureRepository extends JpaRepository<Facture, UUID> {

    List<Facture> findAllByOrderByCreatedAtDesc();

    List<Facture> findByEntrepriseIdAndStatutNotOrderByDateEmissionDesc(UUID entrepriseId, StatutFacture statut);

    @Query(value = "select nextval('facture_numero_seq')", nativeQuery = true)
    long prochainNumero();
}
