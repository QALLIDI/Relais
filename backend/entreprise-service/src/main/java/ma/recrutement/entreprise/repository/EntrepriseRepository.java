package ma.recrutement.entreprise.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.entreprise.domain.Entreprise;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EntrepriseRepository extends JpaRepository<Entreprise, UUID> {
    List<Entreprise> findAllByOrderByRaisonSocialeAsc();
}
