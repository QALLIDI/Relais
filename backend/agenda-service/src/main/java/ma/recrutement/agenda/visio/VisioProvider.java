package ma.recrutement.agenda.visio;

import ma.recrutement.agenda.domain.Reunion;

/**
 * Génère le lien de visioconférence à la confirmation d'une réunion. L'implémentation est choisie
 * par {@code VISIO_PROVIDER} : fake en local, google (Meet) ou microsoft (Teams).
 */
public interface VisioProvider {

    String creerLien(Reunion reunion);
}
