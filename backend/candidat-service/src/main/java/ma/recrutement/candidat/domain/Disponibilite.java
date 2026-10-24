package ma.recrutement.candidat.domain;

public enum Disponibilite {
    IMMEDIATE("Immédiate"),
    UN_MOIS("Sous 1 mois"),
    TROIS_MOIS("Sous 3 mois"),
    NON_DISPONIBLE("Plus en recherche");

    private final String libelle;

    Disponibilite(String libelle) {
        this.libelle = libelle;
    }

    public String libelle() {
        return libelle;
    }
}
