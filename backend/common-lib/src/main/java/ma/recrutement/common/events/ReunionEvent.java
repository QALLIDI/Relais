package ma.recrutement.common.events;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Réunion telle que la voient les consommateurs, commune à reunion.proposee, reunion.reportee
 * et reunion.annulee. Les dates sont en UTC.
 *
 * @param nature    ENTRETIEN_CLIENT, ENTRETIEN_RECRUTEUR, PREQUALIFICATION ou POINT_CLIENT
 * @param type      VISIO, PRESENTIEL ou TELEPHONE
 * @param creneaux  créneaux proposés (proposition) ; vide sinon
 * @param motif     motif du report ou de l'annulation
 */
public record ReunionEvent(
        UUID reunionId,
        UUID candidatureId,
        String nature,
        String type,
        int dureeMinutes,
        String missionIntitule,
        String entrepriseNom,
        String candidatNom,
        String candidatEmail,
        List<String> participants,
        List<OffsetDateTime> creneaux,
        OffsetDateTime debut,
        String lieu,
        String motif) {
}
