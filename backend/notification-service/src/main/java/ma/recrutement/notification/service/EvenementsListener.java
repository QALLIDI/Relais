package ma.recrutement.notification.service;

import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.CandidatPlaceEvent;
import ma.recrutement.common.events.EntretienPlanifieEvent;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.FactureEmiseEvent;
import ma.recrutement.common.events.MissionOuverteEvent;
import ma.recrutement.common.events.RetourClientEvent;
import ma.recrutement.common.events.ShortlistEnvoyeeEvent;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Transforme les événements métier en notifications. Une file par type d'événement.
 */
@Component
@RequiredArgsConstructor
public class EvenementsListener {

    private static final DateTimeFormatter DATE_HEURE = DateTimeFormatter.ofPattern("EEEE d MMMM 'à' HH:mm", Locale.FRENCH);

    private final Notifier notifier;

    @Value("${app.recruteur-email}")
    private String recruteur;

    @Value("${app.front-url}")
    private String front;

    @RabbitListener(bindings = @QueueBinding(value = @Queue(name = "notification.mission-ouverte", durable = "true"),
            exchange = @Exchange(name = Events.EXCHANGE, type = "topic"), key = Events.MISSION_OUVERTE))
    public void missionOuverte(MissionOuverteEvent e) {
        notifier.notifier(recruteur, Events.MISSION_OUVERTE, "Mission ouverte : " + e.intitule(),
                "La mission « %s » pour %s est ouverte. Les profils correspondants du vivier sont proposés dans le pipeline : %s/recruteur/missions/%s"
                        .formatted(e.intitule(), e.entrepriseNom(), front, e.missionId()));
        notifier.notifier(e.contactEmail(), Events.MISSION_OUVERTE, "Votre recrutement est lancé : " + e.intitule(),
                "Votre besoin « %s » a été validé et la recherche de candidats a commencé. Suivez l'avancement : %s/entreprise"
                        .formatted(e.intitule(), front));
    }

    @RabbitListener(bindings = @QueueBinding(value = @Queue(name = "notification.shortlist-envoyee", durable = "true"),
            exchange = @Exchange(name = Events.EXCHANGE, type = "topic"), key = Events.SHORTLIST_ENVOYEE))
    public void shortlist(ShortlistEnvoyeeEvent e) {
        notifier.notifier(e.contactEmail(), Events.SHORTLIST_ENVOYEE,
                "%d profil(s) à évaluer pour « %s »".formatted(e.candidats().size(), e.missionIntitule()),
                "Votre recruteur vous a présenté : %s. Donnez votre avis sur chaque profil : %s/entreprise/shortlist/%s"
                        .formatted(String.join(", ", e.candidats()), front, e.missionId()));
    }

    @RabbitListener(bindings = @QueueBinding(value = @Queue(name = "notification.retour-client", durable = "true"),
            exchange = @Exchange(name = Events.EXCHANGE, type = "topic"), key = Events.RETOUR_CLIENT))
    public void retourClient(RetourClientEvent e) {
        String decision = switch (e.decision()) {
            case "RETENU" -> "retenu";
            case "A_RENCONTRER" -> "à rencontrer";
            default -> "refusé";
        };
        notifier.notifier(recruteur, Events.RETOUR_CLIENT, "Retour client : %s %s".formatted(e.candidatNom(), decision),
                "Le client a donné son avis sur %s pour « %s » : %s.%s".formatted(e.candidatNom(), e.missionIntitule(),
                        decision, e.commentaire() == null ? "" : " Commentaire : " + e.commentaire()));
    }

    @RabbitListener(bindings = @QueueBinding(value = @Queue(name = "notification.entretien-planifie", durable = "true"),
            exchange = @Exchange(name = Events.EXCHANGE, type = "topic"), key = Events.ENTRETIEN_PLANIFIE))
    public void entretien(EntretienPlanifieEvent e) {
        String quand = DATE_HEURE.format(e.dateHeure().atZoneSameInstant(ZoneId.of("Africa/Casablanca")));
        String lieu = e.lieu() == null ? "" : " (" + e.lieu() + ")";
        notifier.notifier(e.candidatEmail(), Events.ENTRETIEN_PLANIFIE, "Entretien proposé : " + e.missionIntitule(),
                "Un entretien vous est proposé le %s%s. Confirmez-le depuis votre espace : %s/candidat"
                        .formatted(quand, lieu, front));
        notifier.notifier(e.contactEmail(), Events.ENTRETIEN_PLANIFIE, "Entretien planifié avec " + e.candidatNom(),
                "Entretien avec %s pour « %s » le %s%s.".formatted(e.candidatNom(), e.missionIntitule(), quand, lieu));
    }

    @RabbitListener(bindings = @QueueBinding(value = @Queue(name = "notification.candidat-place", durable = "true"),
            exchange = @Exchange(name = Events.EXCHANGE, type = "topic"), key = Events.CANDIDAT_PLACE))
    public void placement(CandidatPlaceEvent e) {
        notifier.notifier(recruteur, Events.CANDIDAT_PLACE, "Placement : " + e.candidatNom(),
                "%s est placé(e) chez %s (%s), embauche le %s. Une facture brouillon a été préparée."
                        .formatted(e.candidatNom(), e.entrepriseNom(), e.missionIntitule(), e.dateEmbauche()));
    }

    @RabbitListener(bindings = @QueueBinding(value = @Queue(name = "notification.facture-emise", durable = "true"),
            exchange = @Exchange(name = Events.EXCHANGE, type = "topic"), key = Events.FACTURE_EMISE))
    public void facture(FactureEmiseEvent e) {
        NumberFormat montant = NumberFormat.getNumberInstance(Locale.FRANCE);
        montant.setMinimumFractionDigits(2);
        notifier.notifier(e.contactEmail(), Events.FACTURE_EMISE, "Facture " + e.numero(),
                "Votre facture %s de %s MAD TTC est disponible, à régler avant le %s : %s/entreprise/factures"
                        .formatted(e.numero(), montant.format(e.montantTtc()), e.echeance(), front));
    }
}
