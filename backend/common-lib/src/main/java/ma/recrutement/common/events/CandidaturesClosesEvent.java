package ma.recrutement.common.events;

import java.util.List;
import java.util.UUID;

/** Candidatures retirées parce que la mission a été annulée ; les candidats concernés sont prévenus. */
public record CandidaturesClosesEvent(
        UUID missionId,
        String missionIntitule,
        List<String> candidatEmails) {
}
