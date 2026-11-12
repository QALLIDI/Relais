package ma.recrutement.common.events;

import java.time.LocalDate;
import java.util.UUID;

/** Test technique envoyé au candidat : il reçoit le lien par e-mail. */
public record TestEnvoyeEvent(
        UUID candidatureId,
        String candidatNom,
        String candidatEmail,
        String missionIntitule,
        String intitule,
        Integer dureeMinutes,
        String lien,
        LocalDate dateLimite,
        String message) {
}
