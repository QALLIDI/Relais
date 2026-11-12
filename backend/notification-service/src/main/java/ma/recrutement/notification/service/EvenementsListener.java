package ma.recrutement.notification.service;

import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.CandidatPlaceEvent;
import ma.recrutement.common.events.CandidaturesClosesEvent;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.EntretienPlanifieEvent;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.FactureEmiseEvent;
import ma.recrutement.common.events.MissionAnnuleeEvent;
import ma.recrutement.common.events.MissionOuverteEvent;
import ma.recrutement.common.events.PropositionEvent;
import ma.recrutement.common.events.RattachementEvent;
import ma.recrutement.common.events.ReferenceDemandeeEvent;
import ma.recrutement.common.events.TestEnvoyeEvent;
import ma.recrutement.common.events.RetourClientEvent;
import ma.recrutement.common.events.ShortlistEnvoyeeEvent;
import ma.recrutement.common.events.Topics;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transforme les événements métier en notifications. Lit les topics des services émetteurs
 * et aiguille chaque message selon son type ; un événement déjà traité est ignoré.
 */
@Component
@RequiredArgsConstructor
public class EvenementsListener {

    private static final DateTimeFormatter DATE_HEURE = DateTimeFormatter.ofPattern("EEEE d MMMM 'à' HH:mm", Locale.FRENCH);

    private final Notifier notifier;
    private final EvenementsRecus recus;

    @Value("${app.recruteur-email}")
    private String recruteur;

    @Value("${app.front-url}")
    private String front;

    @KafkaListener(topics = {Topics.ENTREPRISE, Topics.SELECTION, Topics.FACTURATION})
    @Transactional
    public void recevoir(ConsumerRecord<String, String> message) {
        switch (recus.type(message)) {
            case Events.MISSION_OUVERTE -> recus.traiter(message, MissionOuverteEvent.class, this::missionOuverte);
            case Events.MISSION_ANNULEE -> recus.traiter(message, MissionAnnuleeEvent.class, this::missionAnnulee);
            case Events.RATTACHEMENT_ACCEPTE, Events.RATTACHEMENT_REFUSE -> recus.traiter(message, RattachementEvent.class, this::rattachement);
            case Events.SHORTLIST_ENVOYEE -> recus.traiter(message, ShortlistEnvoyeeEvent.class, this::shortlist);
            case Events.RETOUR_CLIENT -> recus.traiter(message, RetourClientEvent.class, this::retourClient);
            case Events.CANDIDATURES_CLOSES -> recus.traiter(message, CandidaturesClosesEvent.class, this::candidaturesCloses);
            case Events.TEST_ENVOYE -> recus.traiter(message, TestEnvoyeEvent.class, this::testEnvoye);
            case Events.REFERENCE_DEMANDEE -> recus.traiter(message, ReferenceDemandeeEvent.class, this::referenceDemandee);
            case Events.ENTRETIEN_PLANIFIE -> recus.traiter(message, EntretienPlanifieEvent.class, this::entretien);
            case Events.CANDIDAT_PLACE -> recus.traiter(message, CandidatPlaceEvent.class, this::placement);
            case Events.FACTURE_EMISE -> recus.traiter(message, FactureEmiseEvent.class, this::facture);
            case Events.PROPOSITION_ENVOYEE, Events.PROPOSITION_ACCEPTEE, Events.PROPOSITION_REFUSEE ->
                    recus.traiter(message, PropositionEvent.class, p -> proposition(recus.type(message), p));
            default -> {
                // Événement sans notification associée.
            }
        }
    }

    void missionOuverte(MissionOuverteEvent e) {
        notifier.notifier(recruteur, Events.MISSION_OUVERTE, "Mission ouverte : " + e.intitule(),
                "La mission « %s » pour %s est ouverte. Les profils correspondants du vivier sont proposés dans le pipeline : %s/recruteur/missions/%s"
                        .formatted(e.intitule(), e.entrepriseNom(), front, e.missionId()));
        String lance = "Votre besoin « %s » a été validé et la recherche de candidats a commencé. Suivez l'avancement : %s/entreprise"
                .formatted(e.intitule(), front);
        notifier.notifier(e.contactEmail(), Events.MISSION_OUVERTE, "Votre recrutement est lancé : " + e.intitule(), lance,
                Mise.depuisTexte(lance).avecSurtitre(e.entrepriseNom()).avecAction("Suivre la mission", front + "/entreprise")
                        .avecNote("Prochaines étapes : recherche et préqualification, puis une shortlist de profils argumentés."));
    }

    void missionAnnulee(MissionAnnuleeEvent e) {
        String texte = "Votre recrutement « %s » a été annulé par votre recruteur.%s Vos autres recrutements continuent normalement : %s/entreprise"
                .formatted(e.intitule(), e.motif() == null ? "" : " Motif : " + e.motif() + ".", front);
        notifier.notifier(e.contactEmail(), Events.MISSION_ANNULEE, "Recrutement annulé : " + e.intitule(), texte,
                new Mise(e.entrepriseNom(),
                        List.of("Votre recrutement « %s » a été annulé.".formatted(e.intitule()),
                                "Les candidats encore en cours sont prévenus par votre recruteur."),
                        e.motif() == null ? List.of() : List.of(new Mise.Info("Motif", e.motif())),
                        new Mise.Action("Voir mes recrutements", front + "/entreprise"),
                        "Un nouveau besoin ? Vous pouvez le décrire à tout moment depuis votre espace."));
    }

    /** Mission annulée : chaque candidat encore en lice reçoit un message, sans le nom du client. */
    void candidaturesCloses(CandidaturesClosesEvent e) {
        String texte = ("Le recrutement « %s » pour lequel vous étiez en lice a été annulé par l'entreprise. "
                + "Ce n'est pas lié à votre profil : votre recruteur vous recontacte dès qu'un poste vous correspond. %s/candidat")
                .formatted(e.missionIntitule(), front);
        for (String email : e.candidatEmails()) {
            notifier.notifier(email, Events.CANDIDATURES_CLOSES, "Recrutement annulé : " + e.missionIntitule(), texte,
                    new Mise("Votre candidature",
                            List.of("Le recrutement « %s » pour lequel vous étiez en lice a été annulé par l'entreprise.".formatted(e.missionIntitule()),
                                    "Ce n'est pas lié à votre profil : votre recruteur vous recontacte dès qu'un poste vous correspond."),
                            List.of(),
                            new Mise.Action("Voir mon espace", front + "/candidat"),
                            "Les entretiens prévus pour ce poste sont annulés."));
        }
    }

    /** Réponse du cabinet à un compte entreprise inscrit en ligne. */
    void rattachement(RattachementEvent e) {
        String prenom = e.nom() == null ? "" : " " + e.nom().split(" ")[0];
        if (e.accepte()) {
            String texte = ("Bonjour%s, votre espace %s est ouvert. Vous pouvez exprimer vos besoins de recrutement, "
                    + "évaluer les profils présentés et suivre vos entretiens : %s/entreprise").formatted(prenom, e.entrepriseNom(), front);
            notifier.notifier(e.email(), Events.RATTACHEMENT_ACCEPTE, "Votre espace " + e.entrepriseNom() + " est ouvert", texte,
                    new Mise(e.entrepriseNom(),
                            List.of("Bonjour%s, votre recruteur a ouvert votre espace entreprise.".formatted(prenom),
                                    "Vous pouvez décrire un premier besoin, évaluer les profils présentés et suivre vos entretiens et factures."),
                            List.of(),
                            new Mise.Action("Ouvrir mon espace", front + "/entreprise"),
                            "Déjà connecté ? Cliquez sur « Vérifier mon accès » ou reconnectez-vous."));
        } else {
            String texte = ("Bonjour%s, votre demande d'accès à l'espace entreprise%s n'a pas pu être validée. "
                    + "Si vous pensez qu'il s'agit d'une erreur, répondez à cet e-mail ou contactez votre recruteur.")
                    .formatted(prenom, e.entrepriseNom() == null ? "" : " pour " + e.entrepriseNom());
            notifier.notifier(e.email(), Events.RATTACHEMENT_REFUSE, "Votre demande d'accès à Recrut", texte,
                    new Mise("Votre demande d'accès",
                            List.of("Bonjour%s, votre demande d'accès à l'espace entreprise%s n'a pas pu être validée."
                                            .formatted(prenom, e.entrepriseNom() == null ? "" : " pour " + e.entrepriseNom()),
                                    "Si vous pensez qu'il s'agit d'une erreur, répondez à cet e-mail ou contactez votre recruteur."),
                            List.of(),
                            null,
                            null));
        }
    }

    /** Test technique : le candidat reçoit le lien, la durée et la date limite. */
    void testEnvoye(TestEnvoyeEvent e) {
        String limite = e.dateLimite() == null ? null : DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.FRENCH).format(e.dateLimite());
        String texte = "Bonjour %s, voici le test « %s » pour le poste de %s.%s%s%s".formatted(prenom(e.candidatNom()), e.intitule(),
                e.missionIntitule(), e.message() == null ? "" : "\n\n" + e.message(), limite == null ? "" : "\n\nÀ rendre avant le " + limite + ".",
                e.lien() == null ? "" : " " + e.lien());
        List<Mise.Info> infos = new java.util.ArrayList<>();
        infos.add(new Mise.Info("Test", e.intitule()));
        if (e.dureeMinutes() != null) {
            infos.add(new Mise.Info("Durée", e.dureeMinutes() + " min"));
        }
        if (limite != null) {
            infos.add(new Mise.Info("À rendre avant le", limite));
        }
        notifier.notifier(e.candidatEmail(), Events.TEST_ENVOYE, "Votre test pour le poste de " + e.missionIntitule(), texte,
                new Mise("Test technique",
                        e.message() == null ? List.of("Bonjour %s, votre recruteur vous propose un test pour le poste de %s.".formatted(prenom(e.candidatNom()), e.missionIntitule()))
                                : List.of("Bonjour %s,".formatted(prenom(e.candidatNom())), e.message()),
                        infos,
                        e.lien() == null ? null : new Mise.Action("Commencer le test", e.lien()),
                        e.lien() == null ? "Votre recruteur vous transmet les modalités du test." : "Prévoyez un moment au calme : le test se fait d'une traite."));
    }

    /** Demande de référence : le référent sait qui va l'appeler et pourquoi. */
    void referenceDemandee(ReferenceDemandeeEvent e) {
        String texte = ("Bonjour %s, %s a donné votre nom comme référence pour un poste de %s. Votre recruteur Recrut vous contactera "
                + "dans les prochains jours pour un échange de 5 minutes. Vous pouvez aussi répondre directement à cet e-mail.")
                .formatted(prenom(e.referentNom()), e.candidatNom(), e.missionIntitule());
        notifier.notifier(e.referentEmail(), Events.REFERENCE_DEMANDEE,
                (e.relance() ? "Rappel : " : "") + "référence pour " + e.candidatNom(), texte,
                new Mise(e.relance() ? "Rappel" : "Demande de référence",
                        List.of("Bonjour %s,".formatted(prenom(e.referentNom())),
                                "%s a donné votre nom comme référence pour un poste de %s.".formatted(e.candidatNom(), e.missionIntitule()),
                                "Votre recruteur vous contactera dans les prochains jours pour un échange d'environ 5 minutes : "
                                        + "points forts, axes de progrès, contexte de travail. Vous pouvez aussi répondre directement à cet e-mail."),
                        List.of(),
                        null,
                        "Vos réponses restent confidentielles et ne sont partagées qu'avec l'entreprise qui recrute."));
    }

    private static String prenom(String nom) {
        return nom == null || nom.isBlank() ? "" : nom.strip().split("\\s+")[0];
    }

    /** Proposition commerciale : envoyée au contact du client, sa réponse au recruteur. */
    void proposition(String type, PropositionEvent e) {
        String formule = switch (e.formule()) {
            case "SUCCES" -> "au succès : %s %% du salaire annuel brut".formatted(e.taux() == null ? "?" : e.taux().stripTrailingZeros().toPlainString());
            case "FORFAIT" -> "forfait de %s MAD par poste".formatted(montant(e.montant()));
            default -> "abonnement de %s MAD par mois".formatted(montant(e.montant()));
        };
        if (Events.PROPOSITION_ENVOYEE.equals(type)) {
            String lien = front + "/entreprise/factures";
            String texte = "Votre recruteur vous propose une formule %s%s. Consultez-la et donnez votre accord : %s"
                    .formatted(formule, e.poste() == null ? "" : " pour le poste de " + e.poste(), lien);
            List<Mise.Info> infos = new java.util.ArrayList<>(List.of(new Mise.Info("Formule", formule)));
            if (e.acomptePct() > 0) {
                infos.add(new Mise.Info("Acompte à l'ouverture", e.acomptePct() + " %"));
            }
            if (e.garantieMois() > 0) {
                infos.add(new Mise.Info("Garantie de remplacement", e.garantieMois() + " mois"));
            }
            notifier.notifier(e.contactEmail(), type, "Proposition commerciale" + (e.poste() == null ? "" : " : " + e.poste()), texte,
                    new Mise(e.entrepriseNom(), List.of("Votre recruteur vous adresse une proposition commerciale"
                            + (e.poste() == null ? "." : " pour le poste de " + e.poste() + ".")),
                            infos, new Mise.Action("Voir et accepter", lien),
                            "La mission démarre dès votre accord ; vous pouvez aussi refuser en indiquant pourquoi."));
        } else {
            boolean acceptee = Events.PROPOSITION_ACCEPTEE.equals(type);
            notifier.notifier(recruteur, type, "Proposition %s par %s".formatted(acceptee ? "acceptée" : "refusée", e.entrepriseNom()),
                    "%s a %s votre proposition (%s)%s.".formatted(e.entrepriseNom(), acceptee ? "accepté" : "refusé", formule,
                            e.motifRefus() == null ? "" : ". Motif : " + e.motifRefus()));
        }
    }

    private static String montant(java.math.BigDecimal v) {
        return v == null ? "?" : NumberFormat.getIntegerInstance(Locale.FRENCH).format(v);
    }

    void shortlist(ShortlistEnvoyeeEvent e) {
        String lien = "%s/entreprise/shortlist/%s".formatted(front, e.missionId());
        notifier.notifier(e.contactEmail(), Events.SHORTLIST_ENVOYEE,
                "%d profil(s) à évaluer pour « %s »".formatted(e.candidats().size(), e.missionIntitule()),
                "Votre recruteur vous a présenté : %s. Donnez votre avis sur chaque profil : %s"
                        .formatted(String.join(", ", e.candidats()), lien),
                new Mise("Shortlist prête",
                        List.of("Votre recruteur a sélectionné ces profils après entretien, test technique et vérification des références."),
                        e.candidats().stream().map(nom -> new Mise.Info(nom, "à évaluer")).toList(),
                        new Mise.Action("Donner mon avis", lien),
                        "Votre avis sous 48 h garde le rythme : les bons profils reçoivent souvent plusieurs offres."));
    }

    void retourClient(RetourClientEvent e) {
        String decision = switch (e.decision()) {
            case "RETENU" -> "retenu";
            case "A_RENCONTRER" -> "à rencontrer";
            default -> "refusé";
        };
        notifier.notifier(recruteur, Events.RETOUR_CLIENT, "Retour client : %s %s".formatted(e.candidatNom(), decision),
                "Le client a donné son avis sur %s pour « %s » : %s.%s".formatted(e.candidatNom(), e.missionIntitule(),
                        decision, e.commentaire() == null ? "" : " Commentaire : " + e.commentaire()));
        if ("REFUSE".equals(e.decision()) && e.candidatEmail() != null) {
            String refus = ("Merci pour le temps que vous avez consacré à votre candidature au poste de « %s ». "
                    + "L'entreprise a choisi de poursuivre avec un autre profil. Votre profil reste visible de votre recruteur "
                    + "pour les prochaines opportunités : %s/candidat").formatted(e.missionIntitule(), front);
            notifier.notifier(e.candidatEmail(), Events.RETOUR_CLIENT, "Votre candidature : " + e.missionIntitule(), refus,
                    new Mise("Votre candidature",
                            List.of("Merci pour le temps que vous avez consacré à votre candidature au poste de « %s ».".formatted(e.missionIntitule()),
                                    "L'entreprise a choisi de poursuivre avec un autre profil. Ce n'est pas un jugement sur vos compétences : "
                                            + "votre recruteur garde votre profil pour les prochaines opportunités."),
                            List.of(),
                            new Mise.Action("Voir mon espace", front + "/candidat"),
                            "Vous pouvez retirer votre profil du vivier à tout moment depuis « Mes données »."));
        }
    }

    void entretien(EntretienPlanifieEvent e) {
        String quand = DATE_HEURE.format(e.dateHeure().atZoneSameInstant(ZoneId.of("Africa/Casablanca")));
        String lieu = e.lieu() == null ? "" : " (" + e.lieu() + ")";
        notifier.notifier(e.candidatEmail(), Events.ENTRETIEN_PLANIFIE, "Entretien proposé : " + e.missionIntitule(),
                "Un entretien vous est proposé le %s%s. Confirmez-le depuis votre espace : %s/candidat"
                        .formatted(quand, lieu, front));
        notifier.notifier(e.contactEmail(), Events.ENTRETIEN_PLANIFIE, "Entretien planifié avec " + e.candidatNom(),
                "Entretien avec %s pour « %s » le %s%s.".formatted(e.candidatNom(), e.missionIntitule(), quand, lieu));
    }

    void placement(CandidatPlaceEvent e) {
        notifier.notifier(recruteur, Events.CANDIDAT_PLACE, "Placement : " + e.candidatNom(),
                "%s est placé(e) chez %s (%s), embauche le %s. Une facture brouillon a été préparée."
                        .formatted(e.candidatNom(), e.entrepriseNom(), e.missionIntitule(), e.dateEmbauche()));
    }

    void facture(FactureEmiseEvent e) {
        NumberFormat montant = NumberFormat.getNumberInstance(Locale.FRANCE);
        montant.setMinimumFractionDigits(2);
        String texte = "Votre facture %s de %s MAD TTC est disponible, à régler avant le %s : %s/entreprise/factures"
                .formatted(e.numero(), montant.format(e.montantTtc()), e.echeance(), front);
        notifier.notifier(e.contactEmail(), Events.FACTURE_EMISE, "Facture " + e.numero(), texte,
                new Mise("Facture " + e.numero(), List.of("Votre facture est disponible dans votre espace."),
                        List.of(new Mise.Info("Montant TTC", montant.format(e.montantTtc()) + " MAD"),
                                new Mise.Info("À régler avant le", String.valueOf(e.echeance()))),
                        new Mise.Action("Voir mes factures", front + "/entreprise/factures"),
                        "Paiement par virement : les coordonnées bancaires figurent sur la facture."));
    }
}
