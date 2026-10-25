package ma.recrutement.common.events;

import java.util.UUID;

/**
 * Évaluation structurée après l'entretien : 4 notes de 1 à 5 et la décision du client
 * (RETENIR, SECOND_ENTRETIEN ou NE_PAS_RETENIR).
 */
public record ReunionAvisEvent(
        UUID reunionId,
        UUID candidatureId,
        String missionIntitule,
        String candidatNom,
        int technique,
        int communication,
        int motivation,
        int adequationEquipe,
        String decision,
        String commentaire,
        String auteur) {
}
