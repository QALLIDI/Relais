package ma.recrutement.compte.web;

import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.recrutement.compte.inscription.TypeCompte;

public final class Dtos {

    private Dtos() {
    }

    /** Étape 1 : type de compte et e-mail (plus le nom, repris dans Keycloak et l'e-mail d'activation). */
    public record DebutRequest(
            @NotNull TypeCompte type,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 100) String prenom,
            @NotBlank @Size(max = 100) String nom,
            @Size(max = 255) String raisonSociale) {
    }

    /** Étape 2 : téléphone et mot de passe (transmis à Keycloak, jamais stocké ici). */
    public record CompteRequest(
            @NotBlank @Size(max = 30) String telephone,
            @NotBlank @Size(min = 8, max = 128, message = "8 caractères minimum") String motDePasse) {
    }

    /** Étape 3 : code reçu par SMS. */
    public record CodeRequest(@NotBlank @Pattern(regexp = "\\d{6}", message = "le code compte 6 chiffres") String code) {
    }

    /**
     * État de l'inscription vu par le front.
     *
     * @param etape            étape à afficher (1 à 5)
     * @param renvoiDans       secondes avant de pouvoir redemander un code (ou l'e-mail à l'étape 4)
     */
    public record InscriptionDto(
            UUID id,
            int etape,
            TypeCompte type,
            String email,
            String prenom,
            String telephoneMasque,
            long renvoiDans) {
    }

    /** Compte de l'utilisateur connecté. */
    public record CompteDto(
            String id,
            String email,
            String type,
            String telephone,
            boolean emailVerifie,
            boolean rattachementEnAttente) {
    }
}
