package ma.recrutement.agenda.service;

import java.net.URI;

import ma.recrutement.agenda.domain.Participant;
import ma.recrutement.agenda.domain.Reunion;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.Attendee;
import net.fortuna.ical4j.model.property.Description;
import net.fortuna.ical4j.model.property.Location;
import net.fortuna.ical4j.model.property.Method;
import net.fortuna.ical4j.model.property.Organizer;
import net.fortuna.ical4j.model.property.ProdId;
import net.fortuna.ical4j.model.property.Sequence;
import net.fortuna.ical4j.model.property.Status;
import net.fortuna.ical4j.model.property.Uid;
import net.fortuna.ical4j.model.property.Url;
import net.fortuna.ical4j.model.property.immutable.ImmutableCalScale;
import net.fortuna.ical4j.model.property.immutable.ImmutableVersion;

/** Invitation calendrier (.ics, RFC 5545) d'une réunion confirmée ou annulée, générée avec ical4j. */
public final class Invitations {

    private Invitations() {
    }

    public static String ics(Reunion r, String organisateur, boolean annulation) {
        VEvent evenement = new VEvent(r.getDebut().toInstant(), r.getFin().toInstant(), titre(r));
        evenement.add(new Uid(r.getId() + "@recrutement.local"));
        // Même UID et séquence supérieure : l'annulation remplace l'invitation dans l'agenda des participants.
        evenement.add(new Sequence(annulation ? 1 : 0));
        evenement.add(new Location(lieu(r)));
        evenement.add(new Description(description(r)));
        if (r.getLienVisio() != null) {
            evenement.add(new Url(URI.create(r.getLienVisio())));
        }
        evenement.add(new Organizer(URI.create("mailto:" + organisateur)));
        for (Participant p : r.getParticipants()) {
            if (p.getEmail() != null && !p.getEmail().isBlank()) {
                evenement.add(new Attendee(URI.create("mailto:" + p.getEmail())));
            }
        }
        evenement.add(annulation ? new Status(Status.VALUE_CANCELLED) : new Status(Status.VALUE_CONFIRMED));

        Calendar calendrier = new Calendar();
        calendrier.add(new ProdId("-//Relais//Agenda//FR"));
        calendrier.add(ImmutableVersion.VERSION_2_0);
        calendrier.add(ImmutableCalScale.GREGORIAN);
        calendrier.add(new Method(annulation ? "CANCEL" : "REQUEST"));
        calendrier.add(evenement);
        return calendrier.toString();
    }

    static String titre(Reunion r) {
        return r.getNature().libelle() + " · " + r.getCandidatNom()
                + (r.getMissionIntitule() == null ? "" : " · " + r.getMissionIntitule());
    }

    static String lieu(Reunion r) {
        if (r.getLienVisio() != null) {
            return r.getLienVisio();
        }
        return r.getLieu() != null && !r.getLieu().isBlank() ? r.getLieu() : r.getType().libelle();
    }

    private static String description(Reunion r) {
        StringBuilder sb = new StringBuilder(r.getNature().libelle()).append(" (").append(r.getType().libelle())
                .append(", ").append(r.getDureeMinutes()).append(" min)");
        if (r.getEntrepriseNom() != null) {
            sb.append("\nEntreprise : ").append(r.getEntrepriseNom());
        }
        if (r.getLienVisio() != null) {
            sb.append("\nLien visio : ").append(r.getLienVisio());
        }
        return sb.toString();
    }
}
