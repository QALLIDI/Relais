package ma.recrutement.common.events;

import java.util.UUID;

public record RetourClientEvent(
        UUID candidatureId,
        String missionIntitule,
        String candidatNom,
        String decision,
        String commentaire) {
}
