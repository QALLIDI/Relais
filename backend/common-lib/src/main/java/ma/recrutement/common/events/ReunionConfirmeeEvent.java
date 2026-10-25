package ma.recrutement.common.events;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Créneau choisi par le candidat ; porte l'invitation calendrier (.ics) à joindre aux e-mails. */
public record ReunionConfirmeeEvent(
        UUID reunionId,
        UUID candidatureId,
        String nature,
        String type,
        String missionIntitule,
        String entrepriseNom,
        String candidatNom,
        String candidatEmail,
        List<String> participants,
        OffsetDateTime debut,
        OffsetDateTime fin,
        String lieu,
        String lienVisio,
        String ics) {
}
