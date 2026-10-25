package ma.recrutement.common.events;

import java.util.List;

/**
 * Un topic Kafka par service émetteur. La clé d'un message est l'identifiant de l'objet concerné,
 * ce qui garde dans l'ordre tous les événements d'un même objet.
 */
public final class Topics {

    public static final String COMPTE = "compte.events";
    public static final String ENTREPRISE = "entreprise.events";
    public static final String CANDIDAT = "candidat.events";
    public static final String SELECTION = "selection.events";
    public static final String AGENDA = "agenda.events";
    public static final String FACTURATION = "facturation.events";

    public static final List<String> TOUS = List.of(COMPTE, ENTREPRISE, CANDIDAT, SELECTION, AGENDA, FACTURATION);

    /** Suffixe des topics d'erreurs, où partent les messages après les nouvelles tentatives. */
    public static final String SUFFIXE_ERREURS = ".DLT";

    private Topics() {
    }
}
