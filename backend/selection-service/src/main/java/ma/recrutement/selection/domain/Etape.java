package ma.recrutement.selection.domain;

/** Étapes du pipeline, dans l'ordre. REFUSE et RETIRE sont des sorties. */
public enum Etape {
    SOURCE("Sourcé"),
    QUALIFIE("Qualifié"),
    ENTRETIEN_RECRUTEUR("Entretien recruteur"),
    PRESENTE("Présenté au client"),
    ENTRETIEN_CLIENT("Entretien client"),
    OFFRE("Offre"),
    PLACE("Placé"),
    REFUSE("Refusé"),
    RETIRE("Retiré");

    private final String libelle;

    Etape(String libelle) {
        this.libelle = libelle;
    }

    public String libelle() {
        return libelle;
    }

    public boolean estSortie() {
        return this == REFUSE || this == RETIRE;
    }

    /** Étapes visibles du client : à partir de la présentation. */
    public boolean visibleDuClient() {
        return this == PRESENTE || this == ENTRETIEN_CLIENT || this == OFFRE || this == PLACE;
    }
}
