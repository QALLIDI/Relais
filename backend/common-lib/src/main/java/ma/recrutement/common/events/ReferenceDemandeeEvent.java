package ma.recrutement.common.events;

import java.util.UUID;

/** Demande de référence : le référent est prévenu que le recruteur va le contacter. */
public record ReferenceDemandeeEvent(
        UUID referenceId,
        String referentNom,
        String referentEmail,
        String candidatNom,
        String missionIntitule,
        boolean relance) {
}
