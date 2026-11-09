package ma.recrutement.common.events;

import java.util.UUID;

/**
 * Le candidat a supprimé son profil (droit à l'effacement). Les services qui gardent une copie
 * de son identité (sélection, agenda) l'anonymisent et clôturent ce qui est encore en cours.
 */
public record CandidatAnonymiseEvent(UUID candidatId) {
}
