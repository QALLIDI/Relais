package ma.recrutement.compte.web;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.compte.inscription.ComptesKeycloak;
import ma.recrutement.compte.web.Dtos.CompteDto;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/comptes")
@RequiredArgsConstructor
public class CompteController {

    private final ComptesKeycloak comptes;

    /** Compte de l'utilisateur connecté ; un compte entreprise sans entrepriseId attend son rattachement. */
    @GetMapping("/moi")
    public CompteDto moi() {
        UserRepresentation u = comptes.trouver(CurrentUser.id())
                .orElseThrow(() -> new NotFoundException("Compte introuvable"));
        String type = CurrentUser.hasRole(Roles.RECRUTEUR) ? Roles.RECRUTEUR
                : CurrentUser.hasRole(Roles.ENTREPRISE) ? Roles.ENTREPRISE : Roles.CANDIDAT;
        String entrepriseId = CurrentUser.jwt().getClaimAsString("entrepriseId");
        return new CompteDto(u.getId(), u.getEmail(), type, ComptesKeycloak.attribut(u, "telephone"),
                Boolean.TRUE.equals(u.isEmailVerified()),
                Roles.ENTREPRISE.equals(type) && (entrepriseId == null || entrepriseId.isBlank()));
    }

    /**
     * Suppression du compte de connexion d'un candidat, appelée par l'espace candidat juste après
     * l'anonymisation de son profil. Les comptes recruteur et entreprise sont gérés par le cabinet.
     */
    @DeleteMapping("/moi")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimerMoi() {
        if (!CurrentUser.hasRole(Roles.CANDIDAT)) {
            throw new AccessDeniedException("Seul un candidat peut supprimer lui-même son compte");
        }
        comptes.supprimer(CurrentUser.id());
    }
}
