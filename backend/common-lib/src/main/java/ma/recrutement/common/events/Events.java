package ma.recrutement.common.events;

/**
 * Types d'événements métier. Le type voyage dans l'en-tête Kafka {@link #TYPE_HEADER},
 * le corps du message est l'événement en JSON.
 */
public final class Events {

    /** En-tête portant le type d'événement (mission.ouverte, candidat.place…). */
    public static final String TYPE_HEADER = "eventType";
    /** En-tête portant l'identifiant unique de l'événement, utilisé pour l'idempotence. */
    public static final String ID_HEADER = "eventId";

    public static final String MISSION_OUVERTE = "mission.ouverte";
    public static final String CANDIDAT_CREE = "candidat.cree";
    public static final String CANDIDAT_MODIFIE = "candidat.modifie";
    public static final String SHORTLIST_ENVOYEE = "shortlist.envoyee";
    public static final String RETOUR_CLIENT = "retour.client";
    public static final String ENTRETIEN_PLANIFIE = "entretien.planifie";
    public static final String CANDIDAT_PLACE = "candidat.place";
    public static final String FACTURE_EMISE = "facture.emise";

    private Events() {
    }
}
