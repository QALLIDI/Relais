package ma.recrutement.common.events;

import java.util.List;
import java.util.UUID;

public record MissionOuverteEvent(
        UUID missionId,
        UUID entrepriseId,
        String entrepriseNom,
        String intitule,
        String ville,
        List<String> competences,
        String contactEmail) {
}
