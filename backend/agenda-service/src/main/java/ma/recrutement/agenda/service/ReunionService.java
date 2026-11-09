package ma.recrutement.agenda.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.agenda.client.SelectionClient;
import ma.recrutement.agenda.client.SelectionClient.ContexteReunion;
import ma.recrutement.agenda.domain.Creneau;
import ma.recrutement.agenda.domain.Disponibilite;
import ma.recrutement.agenda.domain.Enums.Nature;
import ma.recrutement.agenda.domain.Enums.Reponse;
import ma.recrutement.agenda.domain.Enums.Role;
import ma.recrutement.agenda.domain.Enums.Statut;
import ma.recrutement.agenda.domain.Enums.Type;
import ma.recrutement.agenda.domain.Evaluation;
import ma.recrutement.agenda.domain.Reunion;
import ma.recrutement.agenda.repository.DisponibiliteRepository;
import ma.recrutement.agenda.repository.ReunionRepository;
import ma.recrutement.agenda.visio.VisioProvider;
import ma.recrutement.agenda.web.Dtos.*;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.CandidatAnonymiseEvent;
import ma.recrutement.common.events.MissionAnnuleeEvent;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.RetourClientEvent;
import ma.recrutement.common.events.ReunionAvisEvent;
import ma.recrutement.common.events.ReunionConfirmeeEvent;
import ma.recrutement.common.events.ReunionEvent;
import ma.recrutement.common.events.ReunionRappelEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cycle d'une réunion (DAT section 8) : proposition de 1 à 3 créneaux, choix du candidat,
 * rappels, report ou annulation, puis évaluation. Chaque étape publie un événement reunion.*
 * dans agenda.events par l'outbox.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ReunionService {

    private static final Set<Statut> OUVERTES = EnumSet.of(Statut.A_PLANIFIER, Statut.PROPOSEE, Statut.CONFIRMEE,
            Statut.REPORTEE);

    private final ReunionRepository reunions;
    private final DisponibiliteRepository disponibilites;
    private final SelectionClient selection;
    private final VisioProvider visio;
    private final EventPublisher events;
    private final EvenementsRecus recus;

    @Value("${app.recruteur.email}")
    private String recruteurEmail;

    @Value("${app.recruteur.nom}")
    private String recruteurNom;

    // ---------------- Lecture ----------------

    /** Le recruteur voit tout, le client les entretiens de son entreprise, le candidat les siens. */
    @Transactional(readOnly = true)
    public List<ReunionDto> lister() {
        Role vue = vue();
        List<Reunion> liste = switch (vue) {
            case RECRUTEUR -> reunions.findAll();
            case CLIENT -> reunions.findByEntrepriseId(CurrentUser.entrepriseId()).stream()
                    .filter(r -> r.getNature() == Nature.ENTRETIEN_CLIENT).toList();
            case CANDIDAT -> reunions.findByCandidatEmailIgnoreCase(CurrentUser.email()).stream()
                    .filter(r -> r.getStatut() != Statut.A_PLANIFIER).toList();
        };
        return liste.stream()
                .sorted(Comparator.comparing(ReunionService::repere))
                .map(r -> ReunionDto.of(r, vue))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReunionDto detail(UUID id) {
        return ReunionDto.of(chargerVisible(id), vue());
    }

    @Transactional(readOnly = true)
    public String invitation(UUID id) {
        Reunion r = chargerVisible(id);
        if (r.getDebut() == null) {
            throw new BusinessException("La réunion n'a pas encore de créneau confirmé");
        }
        return Invitations.ics(r, recruteurEmail, r.getStatut() == Statut.ANNULEE);
    }

    // ---------------- Proposition ----------------

    public ReunionDto creer(ReunionRequest req) {
        ContexteReunion ctx = contexte(req.candidatureId());
        boolean client = vue() == Role.CLIENT;
        Nature nature = client ? Nature.ENTRETIEN_CLIENT
                : req.nature() != null ? req.nature() : Nature.ENTRETIEN_CLIENT;

        // Une réunion déjà ouverte par un retour « à rencontrer » (ou reportée) est complétée, pas dupliquée.
        if (nature == Nature.ENTRETIEN_CLIENT && req.creneaux() != null && !req.creneaux().isEmpty()) {
            Reunion ouverte = reunions.findFirstByCandidatureIdAndStatutIn(ctx.candidatureId(),
                    EnumSet.of(Statut.A_PLANIFIER, Statut.REPORTEE)).orElse(null);
            if (ouverte != null && ouverte.getNature() == Nature.ENTRETIEN_CLIENT) {
                return proposer(ouverte.getId(), new PropositionRequest(req.type(), req.dureeMinutes(), req.lieu(),
                        req.creneaux()));
            }
        }

        Reunion r = new Reunion();
        r.setCandidatureId(ctx.candidatureId());
        r.setMissionId(ctx.missionId());
        r.setMissionIntitule(ctx.missionIntitule());
        r.setEntrepriseId(ctx.entrepriseId());
        r.setEntrepriseNom(ctx.entrepriseNom());
        r.setContactEmail(ctx.contactEmail());
        r.setCandidatId(ctx.candidatId());
        r.setCandidatNom(ctx.candidatNom());
        r.setCandidatEmail(ctx.candidatEmail());
        r.setNature(nature);
        r.setType(req.type() != null ? req.type() : Type.VISIO);
        r.setDureeMinutes(req.dureeMinutes() != null ? req.dureeMinutes() : 60);
        r.setLieu(req.lieu());
        r.setProposeePar(CurrentUser.email());

        r.ajouterParticipant(ctx.candidatNom(), ctx.candidatEmail(), Role.CANDIDAT, Reponse.EN_ATTENTE);
        if (nature == Nature.ENTRETIEN_CLIENT) {
            if (client) {
                r.ajouterParticipant(CurrentUser.nom(), CurrentUser.email(), Role.CLIENT, Reponse.ACCEPTE);
            }
            r.ajouterParticipant(ctx.entrepriseNom(), ctx.contactEmail(), Role.CLIENT, Reponse.ACCEPTE);
        }
        if (client) {
            r.ajouterParticipant(recruteurNom, recruteurEmail, Role.RECRUTEUR, Reponse.ACCEPTE);
        } else {
            r.ajouterParticipant(CurrentUser.nom(), CurrentUser.email(), Role.RECRUTEUR, Reponse.ACCEPTE);
        }
        if (req.participants() != null) {
            req.participants().forEach(p -> r.ajouterParticipant(p.nom(), p.email(),
                    nature == Nature.ENTRETIEN_CLIENT ? Role.CLIENT : Role.RECRUTEUR, Reponse.EN_ATTENTE, p.facultatif()));
        }
        reunions.save(r);
        if (req.creneaux() != null && !req.creneaux().isEmpty()) {
            proposer(r, req.creneaux());
        }
        return ReunionDto.of(r, vue());
    }

    /** Nouveaux créneaux pour une réunion à planifier, reportée ou encore en attente du candidat. */
    public ReunionDto proposer(UUID id, PropositionRequest req) {
        Reunion r = chargerGerable(id);
        if (!EnumSet.of(Statut.A_PLANIFIER, Statut.REPORTEE, Statut.PROPOSEE).contains(r.getStatut())) {
            throw new BusinessException("Cette réunion ne peut plus recevoir de proposition");
        }
        if (req.type() != null) {
            r.setType(req.type());
        }
        if (req.dureeMinutes() != null) {
            r.setDureeMinutes(req.dureeMinutes());
        }
        if (req.lieu() != null) {
            r.setLieu(req.lieu());
        }
        r.setProposeePar(CurrentUser.email());
        proposer(r, req.creneaux());
        return ReunionDto.of(r, vue());
    }

    private void proposer(Reunion r, List<OffsetDateTime> creneaux) {
        List<OffsetDateTime> uniques = creneaux.stream().map(d -> d.withOffsetSameInstant(ZoneOffset.UTC))
                .distinct().sorted().toList();
        if (uniques.isEmpty() || uniques.size() > 3) {
            throw new BusinessException("Proposez entre 1 et 3 créneaux");
        }
        if (uniques.getFirst().isBefore(OffsetDateTime.now())) {
            throw new BusinessException("Les créneaux proposés doivent être dans le futur");
        }
        r.getCreneaux().clear();
        uniques.forEach(r::ajouterCreneau);
        r.setDebut(null);
        r.setFin(null);
        r.setLienVisio(null);
        r.getParticipants().stream().filter(p -> p.getRole() == Role.CANDIDAT)
                .forEach(p -> p.setReponse(Reponse.EN_ATTENTE));
        r.passerA(Statut.PROPOSEE);
        reunions.saveAndFlush(r);
        events.publier(Topics.AGENDA, Events.REUNION_PROPOSEE, r.getId(), evenement(r, uniques, null));
    }

    // ---------------- Confirmation par le candidat ----------------

    public ReunionDto confirmer(UUID id, UUID creneauId) {
        Reunion r = chargerVisible(id);
        if (r.getStatut() != Statut.PROPOSEE) {
            throw new BusinessException("Aucun créneau n'est en attente de votre choix");
        }
        Creneau choisi = r.getCreneaux().stream().filter(c -> c.getId().equals(creneauId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Créneau introuvable"));
        if (choisi.getDebut().isBefore(OffsetDateTime.now())) {
            throw new BusinessException("Ce créneau est passé : demandez-en un autre");
        }
        r.getCreneaux().forEach(c -> c.setChoisi(c == choisi));
        r.setDebut(choisi.getDebut());
        r.setFin(choisi.getFin());
        r.setMotif(null);
        r.setRappelEmailEnvoye(false);
        r.setRappelSmsEnvoye(false);
        r.getParticipants().stream().filter(p -> p.getRole() == Role.CANDIDAT)
                .forEach(p -> p.setReponse(Reponse.ACCEPTE));
        if (r.getType() == Type.VISIO) {
            r.setLienVisio(visio.creerLien(r));
        }
        r.passerA(Statut.CONFIRMEE);
        events.publier(Topics.AGENDA, Events.REUNION_CONFIRMEE, r.getId(), new ReunionConfirmeeEvent(r.getId(),
                r.getCandidatureId(), r.getNature().name(), r.getType().name(), r.getMissionIntitule(),
                r.getEntrepriseNom(), r.getCandidatNom(), r.getCandidatEmail(), r.emails(), r.getDebut(), r.getFin(),
                Invitations.lieu(r), r.getLienVisio(), Invitations.ics(r, recruteurEmail, false)));
        return ReunionDto.of(r, vue());
    }

    // ---------------- Report et annulation ----------------

    /** Un report libère le créneau : le recruteur ou le client propose ensuite de nouveaux créneaux. */
    public ReunionDto reporter(UUID id, String motif) {
        Reunion r = chargerVisible(id);
        if (r.getStatut() != Statut.PROPOSEE && r.getStatut() != Statut.CONFIRMEE) {
            throw new BusinessException("Seule une réunion proposée ou confirmée peut être reportée");
        }
        OffsetDateTime ancien = r.getDebut();
        r.setMotif(motif);
        r.setDebut(null);
        r.setFin(null);
        r.setLienVisio(null);
        r.getCreneaux().clear();
        r.passerA(Statut.REPORTEE);
        events.publier(Topics.AGENDA, Events.REUNION_REPORTEE, r.getId(), evenement(r, List.of(), ancien));
        return ReunionDto.of(r, vue());
    }

    public ReunionDto annuler(UUID id, String motif) {
        Reunion r = chargerVisible(id);
        if (!r.getStatut().ouverte()) {
            throw new BusinessException("Cette réunion est déjà close");
        }
        r.setMotif(motif);
        r.passerA(Statut.ANNULEE);
        events.publier(Topics.AGENDA, Events.REUNION_ANNULEE, r.getId(), evenement(r, List.of(), r.getDebut()));
        return ReunionDto.of(r, vue());
    }

    // ---------------- Après l'entretien ----------------

    /** Le client (ou le recruteur pour lui) remplit la grille ; selection-service avance la candidature. */
    public ReunionDto evaluer(UUID id, EvaluationRequest req) {
        Reunion r = chargerGerable(id);
        if (r.getStatut() != Statut.CONFIRMEE && r.getStatut() != Statut.TERMINEE) {
            throw new BusinessException("L'évaluation se fait après un entretien confirmé");
        }
        if (r.getEvaluation() != null) {
            throw new BusinessException("Cet entretien a déjà été évalué");
        }
        Evaluation e = new Evaluation();
        e.setReunion(r);
        e.setTechnique(req.technique());
        e.setCommunication(req.communication());
        e.setMotivation(req.motivation());
        e.setAdequationEquipe(req.adequationEquipe());
        e.setDecision(req.decision());
        e.setCommentaire(req.commentaire());
        e.setAuteur(CurrentUser.nom());
        r.setEvaluation(e);
        r.passerA(Statut.TERMINEE);
        events.publier(Topics.AGENDA, Events.REUNION_AVIS, r.getId(), new ReunionAvisEvent(r.getId(),
                r.getCandidatureId(), r.getMissionIntitule(), r.getCandidatNom(), e.getTechnique(),
                e.getCommunication(), e.getMotivation(), e.getAdequationEquipe(), e.getDecision().name(),
                e.getCommentaire(), e.getAuteur()));
        return ReunionDto.of(r, vue());
    }

    public ReunionDto compteRendu(UUID id, String texte) {
        Reunion r = charger(id);
        r.setCompteRendu(texte);
        if (r.getStatut() == Statut.CONFIRMEE && r.getFin() != null && r.getFin().isBefore(OffsetDateTime.now())) {
            r.passerA(Statut.TERMINEE);
        } else {
            r.setUpdatedAt(OffsetDateTime.now());
        }
        return ReunionDto.of(r, Role.RECRUTEUR);
    }

    // ---------------- Rappels (tâche planifiée) ----------------

    /** E-mail dans les 24 h qui précèdent, SMS dans les 2 h ; les réunions passées sont terminées. */
    public void envoyerRappels() {
        OffsetDateTime maintenant = OffsetDateTime.now();
        int envoyes = 0;
        for (Reunion r : reunions.findByStatutAndDebutBetween(Statut.CONFIRMEE, maintenant, maintenant.plusHours(24))) {
            if (!r.isRappelEmailEnvoye()) {
                rappel(r, "EMAIL");
                r.setRappelEmailEnvoye(true);
                envoyes++;
            }
            if (!r.isRappelSmsEnvoye() && Duration.between(maintenant, r.getDebut()).toMinutes() <= 120) {
                rappel(r, "SMS");
                r.setRappelSmsEnvoye(true);
                envoyes++;
            }
        }
        List<Reunion> passees = reunions.findByStatutAndFinBefore(Statut.CONFIRMEE, maintenant);
        passees.forEach(r -> r.passerA(Statut.TERMINEE));
        if (envoyes > 0 || !passees.isEmpty()) {
            log.info("Rappels : {} envoyé(s), {} réunion(s) terminée(s)", envoyes, passees.size());
        }
    }

    private void rappel(Reunion r, String canal) {
        events.publier(Topics.AGENDA, Events.REUNION_RAPPEL, r.getId(), new ReunionRappelEvent(r.getId(), canal,
                r.getMissionIntitule(), r.getEntrepriseNom(), r.getCandidatNom(), r.getCandidatEmail(), r.emails(),
                r.getDebut(), Invitations.lieu(r), r.getLienVisio()));
    }

    // ---------------- Disponibilités du client ----------------

    @Transactional(readOnly = true)
    public List<PlageDto> disponibilites(UUID entrepriseId) {
        UUID cible = CurrentUser.hasRole(Roles.RECRUTEUR) ? entrepriseId : CurrentUser.entrepriseId();
        if (cible == null) {
            throw new BusinessException("Précisez l'entreprise");
        }
        return disponibilites.findByEntrepriseIdOrderByJourAscHeureDebutAsc(cible).stream().map(PlageDto::of).toList();
    }

    public List<PlageDto> remplacerDisponibilites(List<PlageRequest> plages) {
        UUID entrepriseId = CurrentUser.entrepriseId();
        if (plages.stream().anyMatch(p -> !p.heureFin().isAfter(p.heureDebut()))) {
            throw new BusinessException("Chaque plage doit finir après son début");
        }
        disponibilites.deleteByEntrepriseId(entrepriseId);
        disponibilites.flush();
        plages.forEach(p -> {
            Disponibilite d = new Disponibilite();
            d.setEntrepriseId(entrepriseId);
            d.setJour(p.jour());
            d.setHeureDebut(p.heureDebut());
            d.setHeureFin(p.heureFin());
            disponibilites.save(d);
        });
        return disponibilites.findByEntrepriseIdOrderByJourAscHeureDebutAsc(entrepriseId).stream().map(PlageDto::of).toList();
    }

    // ---------------- Missions annulées (événements d'entreprise-service) ----------------

    @KafkaListener(topics = Topics.ENTREPRISE)
    public void recevoirEntreprise(ConsumerRecord<String, String> message) {
        if (Events.MISSION_ANNULEE.equals(recus.type(message))) {
            recus.traiter(message, MissionAnnuleeEvent.class, this::surMissionAnnulee);
        }
    }

    /**
     * Mission annulée : les réunions encore ouvertes sont annulées sans nouvel e-mail, car le client
     * et les candidats sont déjà prévenus de l'annulation de la mission.
     */
    void surMissionAnnulee(MissionAnnuleeEvent e) {
        for (Reunion r : reunions.findByMissionId(e.missionId())) {
            if (r.getStatut().ouverte()) {
                r.setMotif("Mission annulée");
                r.passerA(Statut.ANNULEE);
            }
        }
    }

    // ---------------- Profils supprimés (événements de candidat-service) ----------------

    @KafkaListener(topics = Topics.CANDIDAT)
    public void recevoirCandidat(ConsumerRecord<String, String> message) {
        if (Events.CANDIDAT_ANONYMISE.equals(recus.type(message))) {
            recus.traiter(message, CandidatAnonymiseEvent.class, this::surCandidatAnonymise);
        }
    }

    /**
     * Le candidat a supprimé son profil : son identité est retirée des réunions et celles encore
     * ouvertes sont annulées ; les autres participants sont prévenus, pas le candidat.
     */
    void surCandidatAnonymise(CandidatAnonymiseEvent e) {
        for (Reunion r : reunions.findByCandidatId(e.candidatId())) {
            r.setCandidatNom("Candidat anonymisé");
            r.setCandidatEmail(null);
            r.getParticipants().removeIf(p -> p.getRole() == Role.CANDIDAT);
            if (r.getStatut().ouverte()) {
                r.setMotif("Le candidat a retiré son profil");
                r.passerA(Statut.ANNULEE);
                events.publier(Topics.AGENDA, Events.REUNION_ANNULEE, r.getId(), evenement(r, List.of(), r.getDebut()));
            }
        }
    }

    // ---------------- Événements de selection-service ----------------

    @KafkaListener(topics = Topics.SELECTION)
    public void recevoir(ConsumerRecord<String, String> message) {
        switch (recus.type(message)) {
            case Events.RETOUR_CLIENT -> recus.traiter(message, RetourClientEvent.class, this::surRetourClient);
            default -> {
                // Les autres événements de la sélection ne concernent pas l'agenda.
            }
        }
    }

    /** « À rencontrer » ouvre une réunion à planifier, que le recruteur complète avec des créneaux. */
    void surRetourClient(RetourClientEvent e) {
        if (!"A_RENCONTRER".equals(e.decision()) || e.candidatureId() == null || e.entrepriseId() == null) {
            return;
        }
        if (reunions.existsByCandidatureIdAndStatutIn(e.candidatureId(), OUVERTES)) {
            log.info("Une réunion est déjà ouverte pour la candidature {}", e.candidatureId());
            return;
        }
        Reunion r = new Reunion();
        r.setCandidatureId(e.candidatureId());
        r.setMissionId(e.missionId());
        r.setMissionIntitule(e.missionIntitule());
        r.setEntrepriseId(e.entrepriseId());
        r.setEntrepriseNom(e.entrepriseNom());
        r.setContactEmail(e.contactEmail());
        r.setCandidatId(e.candidatId());
        r.setCandidatNom(e.candidatNom());
        r.setCandidatEmail(e.candidatEmail());
        r.setNature(Nature.ENTRETIEN_CLIENT);
        r.setMotif(e.commentaire());
        r.ajouterParticipant(e.candidatNom(), e.candidatEmail(), Role.CANDIDAT, Reponse.EN_ATTENTE);
        r.ajouterParticipant(e.entrepriseNom(), e.contactEmail(), Role.CLIENT, Reponse.ACCEPTE);
        r.ajouterParticipant(recruteurNom, recruteurEmail, Role.RECRUTEUR, Reponse.ACCEPTE);
        reunions.save(r);
    }

    // ---------------- Outils ----------------

    private ReunionEvent evenement(Reunion r, List<OffsetDateTime> creneaux, OffsetDateTime debut) {
        return new ReunionEvent(r.getId(), r.getCandidatureId(), r.getNature().name(), r.getType().name(),
                r.getDureeMinutes(), r.getMissionIntitule(), r.getEntrepriseNom(), r.getCandidatNom(),
                r.getCandidatEmail(), r.emails(), creneaux, debut, Invitations.lieu(r), r.getMotif());
    }

    private ContexteReunion contexte(UUID candidatureId) {
        try {
            return selection.contexte(candidatureId);
        } catch (FeignException.Forbidden ex) {
            throw new AccessDeniedException("Ce candidat ne vous a pas été présenté");
        } catch (FeignException.NotFound ex) {
            throw new NotFoundException("Candidature introuvable");
        }
    }

    private static Role vue() {
        if (CurrentUser.hasRole(Roles.RECRUTEUR)) {
            return Role.RECRUTEUR;
        }
        if (CurrentUser.hasRole(Roles.ENTREPRISE)) {
            return Role.CLIENT;
        }
        return Role.CANDIDAT;
    }

    /** Date de référence pour le tri : le créneau confirmé, sinon le premier proposé, sinon la création. */
    private static OffsetDateTime repere(Reunion r) {
        if (r.getDebut() != null) {
            return r.getDebut();
        }
        return r.getCreneaux().stream().map(Creneau::getDebut).min(Comparator.naturalOrder()).orElse(r.getCreatedAt());
    }

    private Reunion charger(UUID id) {
        return reunions.findById(id).orElseThrow(() -> new NotFoundException("Réunion introuvable"));
    }

    /** Réunion que l'utilisateur a le droit de voir (et donc de reporter ou d'annuler). */
    private Reunion chargerVisible(UUID id) {
        Reunion r = charger(id);
        boolean visible = switch (vue()) {
            case RECRUTEUR -> true;
            case CLIENT -> r.getNature() == Nature.ENTRETIEN_CLIENT && CurrentUser.entrepriseId().equals(r.getEntrepriseId());
            case CANDIDAT -> r.getCandidatEmail() != null && r.getCandidatEmail().equalsIgnoreCase(CurrentUser.email())
                    && r.getStatut() != Statut.A_PLANIFIER;
        };
        if (!visible) {
            throw new AccessDeniedException("Cette réunion ne vous concerne pas");
        }
        return r;
    }

    /** Réunion que l'utilisateur organise : le recruteur, ou le client pour ses entretiens. */
    private Reunion chargerGerable(UUID id) {
        Reunion r = chargerVisible(id);
        if (vue() == Role.CANDIDAT) {
            throw new AccessDeniedException("Seuls le recruteur et le client organisent la réunion");
        }
        return r;
    }
}
