package ma.recrutement.common.events;

import java.util.UUID;

/**
 * Nouveau message sur le fil d'une mission. Publié une seule fois par « salve » : tant que le
 * destinataire n'a pas ouvert le fil, les messages suivants ne déclenchent pas d'autre e-mail.
 *
 * @param versRecruteur vrai si le message vient de l'entreprise et s'adresse au recruteur
 * @param contactEmail  e-mail du contact principal de l'entreprise (destinataire si versRecruteur est faux)
 */
public record MessageMissionEvent(
        UUID missionId,
        String missionIntitule,
        String entrepriseNom,
        String auteurNom,
        boolean versRecruteur,
        String extrait,
        String contactEmail) {
}
