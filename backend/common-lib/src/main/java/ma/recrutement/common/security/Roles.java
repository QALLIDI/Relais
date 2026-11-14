package ma.recrutement.common.security;

public final class Roles {
    public static final String RECRUTEUR = "RECRUTEUR";
    public static final String ENTREPRISE = "ENTREPRISE";
    /** Administrateur de l'équipe d'une entreprise (cumulé avec ENTREPRISE) : équipe, besoins, propositions, factures. */
    public static final String ENTREPRISE_ADMIN = "ENTREPRISE_ADMIN";
    public static final String CANDIDAT = "CANDIDAT";

    private Roles() {
    }
}
