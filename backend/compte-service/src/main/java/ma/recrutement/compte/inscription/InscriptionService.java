package ma.recrutement.compte.inscription;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.events.CodeSmsEvent;
import ma.recrutement.common.events.CompteCreeEvent;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.compte.config.CompteProperties;
import ma.recrutement.compte.web.Dtos.CompteRequest;
import ma.recrutement.compte.web.Dtos.DebutRequest;
import ma.recrutement.compte.web.Dtos.InscriptionDto;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Parcours d'inscription en 5 étapes (DAT, section 7) : le compte n'est actif qu'après le code SMS
 * puis le clic sur l'e-mail d'activation.
 * <ol>
 *   <li>type de compte et e-mail ;</li>
 *   <li>téléphone et mot de passe : compte Keycloak créé désactivé, code SMS envoyé ;</li>
 *   <li>code SMS ;</li>
 *   <li>compte activé avec l'action « Vérifier l'e-mail », e-mail d'activation envoyé, {@code compte.cree} publié ;</li>
 *   <li>e-mail confirmé : le compte peut se connecter.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InscriptionService {

    private static final String RENVOI_CODE = "renvoi";
    private static final String RENVOI_EMAIL = "renvoi-email";

    private final InscriptionStore store;
    private final ComptesKeycloak comptes;
    private final EvenementsCompte evenements;
    private final CompteProperties props;
    private final SecureRandom aleatoire = new SecureRandom();

    public InscriptionDto commencer(DebutRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String raisonSociale = req.type() == TypeCompte.ENTREPRISE ? nettoyer(req.raisonSociale()) : null;
        if (req.type() == TypeCompte.ENTREPRISE && raisonSociale == null) {
            throw new InscriptionException(HttpStatus.BAD_REQUEST, "Indiquez la raison sociale de votre entreprise.");
        }
        comptes.parEmail(email).ifPresent(u -> {
            if (!ComptesKeycloak.enCours(u)) {
                throw new InscriptionException(HttpStatus.CONFLICT,
                        "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou réinitialisez votre mot de passe.");
            }
        });
        Inscription i = new Inscription(UUID.randomUUID(), req.type(), email, req.prenom().trim(), req.nom().trim(),
                raisonSociale, null, null, 2);
        store.enregistrer(i);
        return dto(i);
    }

    public InscriptionDto etat(UUID id) {
        Inscription i = charger(id);
        if (i.etape() == 4 && emailVerifie(i)) {
            return dto(i.aEtape(5));
        }
        return dto(i);
    }

    /** Étape 2 : crée (ou met à jour) le compte Keycloak désactivé, puis envoie le premier code. */
    public InscriptionDto definirCompte(UUID id, CompteRequest req) {
        Inscription i = charger(id);
        if (i.etape() > 3) {
            throw new InscriptionException(HttpStatus.CONFLICT, "Votre numéro est déjà vérifié.");
        }
        String telephone = Telephones.normaliser(req.telephone());
        // Seuls les pays prévus reçoivent un SMS : évite qu'un robot fasse envoyer des SMS surtaxés à l'étranger.
        String pays = Telephones.pays(telephone);
        if (pays == null || !props.inscription().paysSms().contains(pays)) {
            throw new InscriptionException(HttpStatus.BAD_REQUEST,
                    "Ce numéro n'est pas accepté pour l'inscription. Saisissez un numéro marocain (+212).");
        }
        if (comptes.telephoneDejaUtilise(telephone, i.userId())) {
            throw new InscriptionException(HttpStatus.CONFLICT, "Ce numéro est déjà associé à un compte.");
        }
        long attente = store.attenteRenvoi(id, RENVOI_CODE);
        if (attente > 0 && !telephone.equals(i.telephone())) {
            throw new InscriptionException(HttpStatus.TOO_MANY_REQUESTS,
                    "Patientez %d s avant de demander un nouveau code.".formatted(attente), attente);
        }
        String userId = i.userId();
        if (userId != null && comptes.trouver(userId).isPresent()) {
            comptes.modifier(userId, i, telephone, req.motDePasse());
        } else {
            // Inscription recommencée avec le même e-mail : l'ancien compte inachevé est remplacé.
            comptes.parEmail(i.email()).filter(ComptesKeycloak::enCours).ifPresent(u -> comptes.supprimer(u.getId()));
            userId = comptes.creer(i, telephone, req.motDePasse());
        }
        Inscription suite = i.avecCompte(telephone, userId);
        store.enregistrer(suite);
        if (attente == 0) {
            envoyerCode(suite);
        }
        return dto(suite);
    }

    public InscriptionDto renvoyerCode(UUID id) {
        Inscription i = charger(id);
        if (i.etape() != 3) {
            throw new InscriptionException(HttpStatus.CONFLICT, "Aucun code à renvoyer à cette étape.");
        }
        long attente = store.attenteRenvoi(id, RENVOI_CODE);
        if (attente > 0) {
            throw new InscriptionException(HttpStatus.TOO_MANY_REQUESTS,
                    "Patientez %d s avant de demander un nouveau code.".formatted(attente), attente);
        }
        envoyerCode(i);
        return dto(i);
    }

    /** Étape 3 → 4 : code juste, le compte est activé et l'e-mail d'activation part. */
    public InscriptionDto verifierCode(UUID id, String code) {
        Inscription i = charger(id);
        if (i.etape() != 3) {
            throw new InscriptionException(HttpStatus.CONFLICT, "Aucun code à vérifier à cette étape.");
        }
        InscriptionStore.ResultatEssai essai = store.essayer(id, code);
        switch (essai.resultat()) {
            case EXPIRE -> throw new InscriptionException(HttpStatus.GONE, "Ce code a expiré. Demandez un nouveau code.");
            case EPUISE -> throw new InscriptionException(HttpStatus.TOO_MANY_REQUESTS,
                    "Trop d'essais erronés. Demandez un nouveau code.");
            case FAUX -> throw new InscriptionException(HttpStatus.BAD_REQUEST, essai.essaisRestants() == 0
                    ? "Code incorrect. Demandez un nouveau code."
                    : "Code incorrect. Il vous reste %d essai(s).".formatted(essai.essaisRestants()));
            case BON -> {
                // Le numéro est prouvé ; il ne doit pas avoir été activé entre-temps sur un autre compte.
            }
        }
        if (comptes.telephoneDejaUtilise(i.telephone(), i.userId())) {
            throw new InscriptionException(HttpStatus.CONFLICT, "Ce numéro est déjà associé à un compte.");
        }
        comptes.activer(i.userId());
        Inscription suite = i.aEtape(4);
        store.enregistrer(suite);
        evenements.publier(Events.COMPTE_CREE, i.userId(), new CompteCreeEvent(i.userId(), i.type().name(), i.email(),
                i.prenom(), i.nom(), i.telephone(), i.raisonSociale()));
        envoyerEmail(suite);
        return dto(suite);
    }

    public InscriptionDto renvoyerEmail(UUID id) {
        Inscription i = charger(id);
        if (i.etape() != 4) {
            throw new InscriptionException(HttpStatus.CONFLICT, "Aucun e-mail d'activation à renvoyer à cette étape.");
        }
        if (emailVerifie(i)) {
            return dto(i.aEtape(5));
        }
        long attente = store.attenteRenvoi(id, RENVOI_EMAIL);
        if (attente > 0) {
            throw new InscriptionException(HttpStatus.TOO_MANY_REQUESTS,
                    "Patientez %d s avant de renvoyer l'e-mail.".formatted(attente), attente);
        }
        envoyerEmail(i);
        return dto(i);
    }

    private void envoyerCode(Inscription i) {
        long quota = store.compterEnvoiSms(i.telephone());
        if (quota > 0) {
            throw new InscriptionException(HttpStatus.TOO_MANY_REQUESTS,
                    "Trop de codes envoyés à ce numéro. Réessayez dans %d min.".formatted((quota + 59) / 60), quota);
        }
        if (store.plafondSmsDuJourAtteint()) {
            log.error("Plafond quotidien de SMS atteint ({}) : envoi refusé pour l'inscription {}",
                    props.inscription().smsParJour(), i.id());
            throw new InscriptionException(HttpStatus.SERVICE_UNAVAILABLE,
                    "L'envoi de SMS est momentanément indisponible. Réessayez dans quelques heures.");
        }
        String code = "%06d".formatted(aleatoire.nextInt(1_000_000));
        store.enregistrerCode(i.id(), code);
        store.bloquerRenvoi(i.id(), RENVOI_CODE);
        try {
            evenements.publier(Events.COMPTE_CODE_SMS, i.id(), new CodeSmsEvent(i.id(), i.telephone(), code,
                    (int) props.inscription().dureeCode().toMinutes()));
        } catch (RuntimeException e) {
            store.supprimerCode(i.id());
            store.debloquerRenvoi(i.id(), RENVOI_CODE);
            throw e;
        }
    }

    private void envoyerEmail(Inscription i) {
        store.bloquerRenvoi(i.id(), RENVOI_EMAIL);
        try {
            comptes.envoyerEmailActivation(i.userId(), props.frontUrl() + "/inscription?id=" + i.id());
        } catch (RuntimeException e) {
            // Le compte est activé : l'utilisateur pourra renvoyer l'e-mail depuis l'étape 4.
            log.warn("Envoi de l'e-mail d'activation à {} impossible : {}", i.email(), e.getMessage());
        }
    }

    private boolean emailVerifie(Inscription i) {
        return comptes.trouver(i.userId()).map(UserRepresentation::isEmailVerified).orElse(false);
    }

    private Inscription charger(UUID id) {
        return store.trouver(id).orElseThrow(() -> new NotFoundException(
                "Inscription introuvable ou expirée. Recommencez votre inscription."));
    }

    private InscriptionDto dto(Inscription i) {
        String quoi = i.etape() == 4 ? RENVOI_EMAIL : RENVOI_CODE;
        return new InscriptionDto(i.id(), i.etape(), i.type(), i.email(), i.prenom(),
                Telephones.masquer(i.telephone()), store.attenteRenvoi(i.id(), quoi));
    }

    private static String nettoyer(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
