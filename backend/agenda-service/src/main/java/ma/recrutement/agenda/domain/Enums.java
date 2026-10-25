package ma.recrutement.agenda.domain;

/** Énumérations du domaine des réunions. */
public final class Enums {

    private Enums() {
    }

    /** Objet de la réunion : seul l'entretien client implique l'entreprise. */
    public enum Nature {
        PREQUALIFICATION("Pré-qualification"),
        ENTRETIEN_RECRUTEUR("Entretien recruteur"),
        ENTRETIEN_CLIENT("Entretien client");

        private final String libelle;

        Nature(String libelle) {
            this.libelle = libelle;
        }

        public String libelle() {
            return libelle;
        }
    }

    public enum Type {
        VISIO("Visio"), PRESENTIEL("Sur site"), TELEPHONE("Téléphone");

        private final String libelle;

        Type(String libelle) {
            this.libelle = libelle;
        }

        public String libelle() {
            return libelle;
        }
    }

    /**
     * Cycle de vie : A_PLANIFIER (ouverte par un retour client « à rencontrer », sans créneau),
     * PROPOSEE (créneaux envoyés), CONFIRMEE (créneau choisi), REPORTEE (en attente de nouveaux
     * créneaux), ANNULEE, TERMINEE (après l'heure de fin, ou une fois évaluée).
     */
    public enum Statut {
        A_PLANIFIER, PROPOSEE, CONFIRMEE, REPORTEE, ANNULEE, TERMINEE;

        public boolean ouverte() {
            return this == A_PLANIFIER || this == PROPOSEE || this == CONFIRMEE || this == REPORTEE;
        }
    }

    public enum Role { CANDIDAT, CLIENT, RECRUTEUR }

    public enum Reponse { EN_ATTENTE, ACCEPTE, DECLINE }

    public enum Decision { RETENIR, SECOND_ENTRETIEN, NE_PAS_RETENIR }
}
