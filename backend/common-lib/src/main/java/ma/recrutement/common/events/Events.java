package ma.recrutement.common.events;

/**
 * Noms de l'exchange et des clés de routage partagés par tous les services.
 */
public final class Events {

    public static final String EXCHANGE = "recrutement.events";

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
