package ma.recrutement.common.events;

import java.util.UUID;

/** Suite donnée à une demande de rattachement : le contact est prévenu par e-mail. */
public record RattachementEvent(
        UUID demandeId,
        String nom,
        String email,
        String entrepriseNom,
        boolean accepte) {
}
