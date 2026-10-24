package ma.recrutement.common.events;

import java.util.List;
import java.util.UUID;

/** Publié à la création et à la modification d'un profil candidat. */
public record CandidatEvent(
        UUID candidatId,
        String nomComplet,
        String titre,
        int anneesExperience,
        String ville,
        List<String> competences) {
}
