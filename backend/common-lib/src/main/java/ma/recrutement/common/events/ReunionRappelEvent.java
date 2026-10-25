package ma.recrutement.common.events;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Rappel avant une réunion confirmée : {@code canal} vaut EMAIL (la veille) ou SMS (2 h avant). */
public record ReunionRappelEvent(
        UUID reunionId,
        String canal,
        String missionIntitule,
        String entrepriseNom,
        String candidatNom,
        String candidatEmail,
        List<String> participants,
        OffsetDateTime debut,
        String lieu,
        String lienVisio) {
}
