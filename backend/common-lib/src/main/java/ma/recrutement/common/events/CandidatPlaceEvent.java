package ma.recrutement.common.events;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Publié quand un candidat passe à l'étape PLACE ; déclenche la facturation. */
public record CandidatPlaceEvent(
        UUID candidatureId,
        UUID missionId,
        UUID entrepriseId,
        String entrepriseNom,
        String missionIntitule,
        UUID candidatId,
        String candidatNom,
        BigDecimal salaireAnnuel,
        BigDecimal tauxHonoraires,
        LocalDate dateEmbauche,
        String contactEmail) {
}
