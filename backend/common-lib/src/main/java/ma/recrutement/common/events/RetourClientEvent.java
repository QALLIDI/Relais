package ma.recrutement.common.events;

import java.util.UUID;

/**
 * Avis du client sur un profil présenté. Les champs après {@code commentaire} servent à
 * agenda-service, qui ouvre une réunion à planifier quand le client veut rencontrer le candidat.
 */
public record RetourClientEvent(
        UUID candidatureId,
        String missionIntitule,
        String candidatNom,
        String decision,
        String commentaire,
        UUID missionId,
        UUID entrepriseId,
        String entrepriseNom,
        UUID candidatId,
        String candidatEmail,
        String contactEmail) {
}
