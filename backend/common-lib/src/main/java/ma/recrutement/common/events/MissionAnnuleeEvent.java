package ma.recrutement.common.events;

import java.util.UUID;

/** Mission annulée par le recruteur ; le contact du client en est informé. */
public record MissionAnnuleeEvent(
        UUID missionId,
        UUID entrepriseId,
        String entrepriseNom,
        String intitule,
        String motif,
        String contactEmail) {
}
