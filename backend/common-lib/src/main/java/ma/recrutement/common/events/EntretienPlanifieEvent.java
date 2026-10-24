package ma.recrutement.common.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EntretienPlanifieEvent(
        UUID entretienId,
        String missionIntitule,
        String candidatNom,
        String candidatEmail,
        String contactEmail,
        OffsetDateTime dateHeure,
        String lieu) {
}
