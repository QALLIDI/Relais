package ma.recrutement.notification.service;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.ReunionAvisEvent;
import ma.recrutement.common.events.ReunionConfirmeeEvent;
import ma.recrutement.common.events.ReunionEvent;
import ma.recrutement.common.events.ReunionRappelEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.notification.service.Notifier.PieceJointe;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Notifications des réunions (topic agenda.events) : proposition au candidat, invitation .ics à tous
 * à la confirmation, rappels, report, annulation et avis du client au recruteur.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReunionsListener {

    private static final DateTimeFormatter DATE_HEURE = DateTimeFormatter.ofPattern("EEEE d MMMM 'à' HH:mm", Locale.FRENCH);
    private static final ZoneId MAROC = ZoneId.of("Africa/Casablanca");

    private final Notifier notifier;
    private final EvenementsRecus recus;

    @Value("${app.recruteur-email}")
    private String recruteur;

    @Value("${app.front-url}")
    private String front;

    @KafkaListener(topics = Topics.AGENDA)
    @Transactional
    public void recevoir(ConsumerRecord<String, String> message) {
        switch (recus.type(message)) {
            case Events.REUNION_PROPOSEE -> recus.traiter(message, ReunionEvent.class, this::proposee);
            case Events.REUNION_CONFIRMEE -> recus.traiter(message, ReunionConfirmeeEvent.class, this::confirmee);
            case Events.REUNION_RAPPEL -> recus.traiter(message, ReunionRappelEvent.class, this::rappel);
            case Events.REUNION_REPORTEE -> recus.traiter(message, ReunionEvent.class, e -> changee(e, "reportée", Events.REUNION_REPORTEE));
            case Events.REUNION_ANNULEE -> recus.traiter(message, ReunionEvent.class, e -> changee(e, "annulée", Events.REUNION_ANNULEE));
            case Events.REUNION_AVIS -> recus.traiter(message, ReunionAvisEvent.class, this::avis);
            default -> {
                // Événement sans notification associée.
            }
        }
    }

    void proposee(ReunionEvent e) {
        String creneaux = e.creneaux().stream().map(d -> "  • " + quand(d)).collect(Collectors.joining("\n"));
        String avec = "ENTRETIEN_CLIENT".equals(e.nature()) && e.entrepriseNom() != null ? e.entrepriseNom() : "Votre recruteur";
        notifier.notifier(e.candidatEmail(), Events.REUNION_PROPOSEE, "Entretien proposé : " + e.missionIntitule(),
                "%s vous propose un entretien (%s, %d min) pour « %s ». Créneaux proposés :%n%s%n%nChoisissez celui qui vous convient : %s/candidat/reunions/%s"
                        .formatted(avec, type(e.type()), e.dureeMinutes(), e.missionIntitule(), creneaux, front, e.reunionId()));
        for (String email : autres(e.participants(), e.candidatEmail())) {
            notifier.notifier(email, Events.REUNION_PROPOSEE, "Créneaux envoyés à " + e.candidatNom(),
                    "%d créneau(x) proposé(s) à %s pour « %s » :%n%s%nVous recevrez l'invitation dès son choix."
                            .formatted(e.creneaux().size(), e.candidatNom(), e.missionIntitule(), creneaux));
        }
    }

    void confirmee(ReunionConfirmeeEvent e) {
        PieceJointe ics = new PieceJointe("invitation.ics", "text/calendar; charset=UTF-8; method=REQUEST",
                e.ics().getBytes(StandardCharsets.UTF_8));
        String visio = e.lienVisio() == null ? "" : "\nLien visio : " + e.lienVisio();
        for (String email : e.participants()) {
            boolean candidat = email.equalsIgnoreCase(e.candidatEmail());
            String titre = candidat ? "Entretien confirmé : " + e.missionIntitule()
                    : "Entretien confirmé avec " + e.candidatNom();
            notifier.notifier(email, Events.REUNION_CONFIRMEE, titre,
                    "Entretien (%s) avec %s pour « %s » le %s, %s.%s%n%nL'invitation est jointe à cet e-mail (fichier .ics) : ouvrez-la pour l'ajouter à votre agenda."
                            .formatted(type(e.type()).toLowerCase(Locale.FRENCH), e.candidatNom(), e.missionIntitule(),
                                    quand(e.debut()), e.lieu(), visio), ics);
        }
    }

    void rappel(ReunionRappelEvent e) {
        String visio = e.lienVisio() == null ? "" : " Lien : " + e.lienVisio();
        if ("SMS".equals(e.canal())) {
            // Pas de fournisseur SMS en local : le SMS est écrit dans les logs et copié dans Mailpit.
            String sms = "Rappel : entretien %s à %s (%s).%s".formatted(e.missionIntitule(),
                    e.debut().atZoneSameInstant(MAROC).format(DateTimeFormatter.ofPattern("HH:mm")), e.lieu(), visio);
            log.info("[SMS console] à {} : {}", e.candidatEmail(), sms);
            notifier.notifier(e.candidatEmail(), Events.REUNION_RAPPEL, "[SMS] Rappel d'entretien", sms);
            return;
        }
        for (String email : e.participants()) {
            notifier.notifier(email, Events.REUNION_RAPPEL, "Rappel : entretien " + quand(e.debut()),
                    "Rappel : entretien avec %s pour « %s » le %s (%s).%s"
                            .formatted(e.candidatNom(), e.missionIntitule(), quand(e.debut()), e.lieu(), visio));
        }
    }

    void changee(ReunionEvent e, String verbe, String type) {
        String quand = e.debut() == null ? "" : " prévu le " + quand(e.debut());
        String motif = e.motif() == null ? "" : " Motif : " + e.motif() + ".";
        String suite = "reportée".equals(verbe) ? " De nouveaux créneaux vont vous être proposés." : "";
        for (String email : e.participants()) {
            notifier.notifier(email, type, "Entretien %s : %s".formatted(verbe, e.missionIntitule()),
                    "L'entretien avec %s pour « %s »%s est %s.%s%s"
                            .formatted(e.candidatNom(), e.missionIntitule(), quand, verbe, motif, suite));
        }
    }

    void avis(ReunionAvisEvent e) {
        String decision = switch (e.decision()) {
            case "RETENIR" -> "à retenir";
            case "SECOND_ENTRETIEN" -> "à revoir en second entretien";
            default -> "à ne pas retenir";
        };
        double moyenne = (e.technique() + e.communication() + e.motivation() + e.adequationEquipe()) / 4.0;
        notifier.notifier(recruteur, Events.REUNION_AVIS, "Avis après entretien : %s %s".formatted(e.candidatNom(), decision),
                "%s a évalué %s pour « %s » : technique %d, communication %d, motivation %d, équipe %d (moyenne %s / 5). Décision : %s.%s"
                        .formatted(e.auteur() == null ? "Le client" : e.auteur(), e.candidatNom(), e.missionIntitule(),
                                e.technique(), e.communication(), e.motivation(), e.adequationEquipe(),
                                String.format(Locale.FRENCH, "%.1f", moyenne), decision,
                                e.commentaire() == null ? "" : " Commentaire : " + e.commentaire()));
    }

    private static List<String> autres(List<String> participants, String exclu) {
        return participants.stream().filter(p -> !p.equalsIgnoreCase(exclu == null ? "" : exclu)).toList();
    }

    private static String quand(OffsetDateTime d) {
        return DATE_HEURE.format(d.atZoneSameInstant(MAROC));
    }

    private static String type(String type) {
        return switch (type) {
            case "PRESENTIEL" -> "Sur site";
            case "TELEPHONE" -> "Téléphone";
            default -> "Visio";
        };
    }
}
