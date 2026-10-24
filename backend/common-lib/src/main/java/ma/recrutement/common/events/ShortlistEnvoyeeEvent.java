package ma.recrutement.common.events;

import java.util.List;
import java.util.UUID;

public record ShortlistEnvoyeeEvent(
        UUID missionId,
        UUID entrepriseId,
        String missionIntitule,
        String contactEmail,
        List<String> candidats) {
}
