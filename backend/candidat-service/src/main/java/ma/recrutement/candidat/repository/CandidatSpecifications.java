package ma.recrutement.candidat.repository;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import ma.recrutement.candidat.domain.Candidat;
import ma.recrutement.candidat.domain.Disponibilite;
import ma.recrutement.candidat.domain.Niveau;
import org.springframework.data.jpa.domain.Specification;

/**
 * Recherche multicritère dans le vivier. Le mot-clé porte sur le nom, le titre et les compétences.
 */
public final class CandidatSpecifications {

    private CandidatSpecifications() {
    }

    public static Specification<Candidat> recherche(String q, String ville, Niveau niveau,
                                                    Disponibilite disponibilite, String competence,
                                                    String secteur) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("anonymise")));
            if (query != null) {
                query.distinct(true);
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                Join<Candidat, String> comp = root.joinList("competences", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("nomComplet")), like),
                        cb.like(cb.lower(root.get("titre")), like),
                        cb.like(cb.lower(comp), like)));
            }
            if (ville != null && !ville.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("ville")), ville.trim().toLowerCase()));
            }
            if (secteur != null && !secteur.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("secteur")), secteur.trim().toLowerCase()));
            }
            if (niveau != null) {
                predicates.add(cb.equal(root.get("niveau"), niveau));
            }
            if (disponibilite != null) {
                predicates.add(cb.equal(root.get("disponibilite"), disponibilite));
            }
            if (competence != null && !competence.isBlank()) {
                Join<Candidat, String> comp2 = root.joinList("competences");
                predicates.add(cb.equal(cb.lower(comp2), competence.trim().toLowerCase()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
