package ma.recrutement.candidat.domain;

public enum Niveau {
    JUNIOR("Junior (moins de 2 ans)"),
    CONFIRME("Confirmé (2 à 5 ans)"),
    SENIOR("Senior (5 ans et plus)");

    private final String libelle;

    Niveau(String libelle) {
        this.libelle = libelle;
    }

    public String libelle() {
        return libelle;
    }

    public static Niveau depuisExperience(int annees) {
        if (annees < 2) {
            return JUNIOR;
        }
        return annees < 5 ? CONFIRME : SENIOR;
    }
}
