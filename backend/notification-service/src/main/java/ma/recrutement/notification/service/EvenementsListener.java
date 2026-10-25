package ma.recrutement.notification.service;

import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.CandidatPlaceEvent;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.EntretienPlanifieEvent;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.FactureEmiseEvent;
import ma.recrutement.common.events.MissionOuverteEvent;
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
            case Events.SHORTLIST_ENVOYEE -> recus.traiter(message, ShortlistEnvoyeeEvent.class, this::shortlist);
            case Events.RETOUR_CLIENT -> recus.traiter(message, RetourClientEvent.class, this::retourClient);
            case Events.ENTRETIEN_PLANIFIE -> recus.traiter(message, EntretienPlanifieEvent.class, this::entretien);
            case Events.CANDIDAT_PLACE -> recus.traiter(message, CandidatPlaceEvent.class, this::placement);
            case Events.FACTURE_EMISE -> recus.traiter(message, FactureEmiseEvent.class, this::facture);
            default -> {
                // Événement sans notification associée.
            }
        }
    }

    void missionOuverte(MissionOuverteEvent e) {
        notifier.notifier(recruteur, Events.MISSION_OUVERTE, "Mission ouverte : " + e.intitule(),
                "La mission « %s » pour %s est ouverte. Les profils correspondants du vivier sont proposés dans le pipeline : %s/recruteur/missions/%s"
                        .formatted(e.intitule(), e.entrepriseNom(), front, e.missionId()));
        notifier.notifier(e.contactEmail(), Events.MISSION_OUVERTE, "Votre recrutement est lancé : " + e.intitule(),
                "Votre besoin « %s » a été validé et la recherche de candidats a commencé. Suivez l'avancement : %s/entreprise"
                        .formatted(e.intitule(), front));
    }

    void shortlist(ShortlistEnvoyeeEvent e) {
        notifier.notifier(e.contactEmail(), Events.SHORTLIST_ENVOYEE,
                "%d profil(s) à évaluer pour « %s »".formatted(e.candidats().size(), e.missionIntitule()),
                "Votre recruteur vous a présenté : %s. Donnez votre avis sur chaque profil : %s/entreprise/shortlist/%s"
                        .formatted(String.join(", ", e.candidats()), front, e.missionId()));
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
        notifier.notifier(e.contactEmail(), Events.FACTURE_EMISE, "Facture " + e.numero(),
                "Votre facture %s de %s MAD TTC est disponible, à régler avant le %s : %s/entreprise/factures"
                        .formatted(e.numero(), montant.format(e.montantTtc()), e.echeance(), front));
    }
}
