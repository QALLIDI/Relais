package ma.recrutement.selection.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.events.CandidatPlaceEvent;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.CandidatAnonymiseEvent;
import ma.recrutement.common.events.CandidaturesClosesEvent;
import ma.recrutement.common.events.MissionAnnuleeEvent;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.events.RetourClientEvent;
import ma.recrutement.common.events.ReunionAvisEvent;
import ma.recrutement.common.events.ReunionConfirmeeEvent;
import ma.recrutement.common.events.ShortlistEnvoyeeEvent;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.selection.client.CandidatClient;
import ma.recrutement.selection.client.CandidatClient.CandidatView;
import ma.recrutement.selection.client.EntrepriseClient;
import ma.recrutement.selection.client.EntrepriseClient.MissionView;
import ma.recrutement.selection.domain.AvisClient;
import ma.recrutement.selection.domain.Candidature;
import ma.recrutement.selection.domain.Etape;
import ma.recrutement.selection.repository.CandidatureRepository;
import ma.recrutement.selection.web.Dtos.*;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class SelectionService {

    private static final List<Etape> COLONNES = List.of(Etape.SOURCE, Etape.QUALIFIE, Etape.ENTRETIEN_RECRUTEUR,
            Etape.PRESENTE, Etape.ENTRETIEN_CLIENT, Etape.OFFRE, Etape.PLACE);
    private static final Set<Etape> VISIBLES_CLIENT = EnumSet.of(Etape.PRESENTE, Etape.ENTRETIEN_CLIENT,
            Etape.OFFRE, Etape.PLACE);

    private final CandidatureRepository candidatures;
    private final EntrepriseClient entrepriseClient;
    private final CandidatClient candidatClient;
    private final EventPublisher events;
    private final EvenementsRecus recus;

    // ---------------- Pipeline (recruteur) ----------------

    @Transactional(readOnly = true)
    public PipelineDto pipeline(UUID missionId) {
        List<Candidature> toutes = candidatures.findByMissionIdOrderByScoreDesc(missionId);
        List<ColonneDto> colonnes = COLONNES.stream()
                .map(etape -> new ColonneDto(etape, etape.libelle(), toutes.stream()
                        .filter(c -> c.getEtape() == etape).map(CandidatureDto::of).toList()))
                .toList();
        List<CandidatureDto> sorties = toutes.stream().filter(c -> c.getEtape().estSortie())
                .map(CandidatureDto::of).toList();
        return new PipelineDto(missionId, colonnes, sorties);
    }

    /** Profils du vivier les mieux classés pour la mission, hors ceux déjà dans le pipeline. */
    @Transactional(readOnly = true)
    public List<SuggestionDto> suggestions(UUID missionId) {
        MissionView m = entrepriseClient.mission(missionId);
        Set<UUID> deja = candidatures.findByMissionIdOrderByScoreDesc(missionId).stream()
                .map(Candidature::getCandidatId).collect(Collectors.toSet());
        return candidatClient.vivier().stream()
                .filter(c -> !deja.contains(c.id()))
                .map(c -> new SuggestionDto(c.id(), c.nomComplet(), c.titre(), c.anneesExperience(), c.ville(),
                        c.competences(), c.disponibiliteLibelle(), score(m, c)))
                .sorted(Comparator.comparingInt(SuggestionDto::score).reversed())
                .limit(10)
                .toList();
    }

    public CandidatureDto ajouter(UUID missionId, UUID candidatId) {
        if (candidatures.existsByMissionIdAndCandidatId(missionId, candidatId)) {
            throw new BusinessException("Ce candidat est déjà dans le pipeline de cette mission");
        }
        MissionView m = entrepriseClient.mission(missionId);
        CandidatView cv = candidatClient.resumes(List.of(candidatId)).stream().findFirst()
                .orElseThrow(() -> new NotFoundException("Candidat introuvable"));
        Candidature c = new Candidature();
        c.setMissionId(m.id());
        c.setEntrepriseId(m.entrepriseId());
        c.setEntrepriseNom(m.entrepriseNom());
        c.setMissionIntitule(m.intitule());
        c.setContactEmail(m.contactEmail());
        c.setCandidatId(cv.id());
        c.setCandidatNom(cv.nomComplet());
        c.setCandidatEmail(cv.email());
        c.setCandidatTitre(cv.titre());
        c.setCandidatExperience(cv.anneesExperience());
        c.setCandidatVille(cv.ville());
        c.setCandidatCompetences(cv.competences() == null ? null : String.join(", ", cv.competences()));
        c.setCandidatDisponibilite(cv.disponibiliteLibelle());
        c.setCandidatPretention(cv.pretentionSalaire());
        c.setScore(score(m, cv));
        return CandidatureDto.of(candidatures.save(c));
    }

    public CandidatureDto changerEtape(UUID id, EtapeRequest req) {
        Candidature c = charger(id);
        if (req.etape().estSortie() && (req.motif() == null || req.motif().isBlank())) {
            throw new BusinessException("Indiquez le motif du refus ou du retrait");
        }
        if (req.etape() == Etape.PLACE) {
            placer(c, req);
        }
        c.passerA(req.etape());
        c.setMotifSortie(req.etape().estSortie() ? req.motif() : null);
        return CandidatureDto.of(c);
    }

    private void placer(Candidature c, EtapeRequest req) {
        if (req.salaireAnnuel() == null || req.dateEmbauche() == null) {
            throw new BusinessException("Le salaire annuel et la date d'embauche sont obligatoires pour un placement");
        }
        c.setSalaireAnnuel(req.salaireAnnuel());
        c.setDateEmbauche(req.dateEmbauche());
        MissionView m = entrepriseClient.mission(c.getMissionId());
        events.publier(Topics.SELECTION, Events.CANDIDAT_PLACE, c.getId(), new CandidatPlaceEvent(c.getId(),
                c.getMissionId(), c.getEntrepriseId(), c.getEntrepriseNom(), c.getMissionIntitule(),
                c.getCandidatId(), c.getCandidatNom(), req.salaireAnnuel(), m.tauxHonoraires(),
                req.dateEmbauche(), m.contactEmail()));
    }

    public CandidatureDto evaluer(UUID id, EvaluationRequest req) {
        Candidature c = charger(id);
        c.setNoteGlobale(req.noteGlobale());
        c.setSynthese(req.synthese());
        c.setUpdatedAt(OffsetDateTime.now());
        return CandidatureDto.of(c);
    }

    /** Envoie une shortlist : les candidatures passent « Présenté au client » et le client est prévenu. */
    public List<CandidatureDto> envoyerShortlist(ShortlistRequest req) {
        List<Candidature> choisies = candidatures.findAllById(req.candidatureIds());
        if (choisies.isEmpty() || choisies.stream().anyMatch(c -> !c.getMissionId().equals(req.missionId()))) {
            throw new BusinessException("Les candidatures doivent appartenir à la mission");
        }
        choisies.forEach(c -> {
            c.passerA(Etape.PRESENTE);
            c.setAvisClient(null);
            c.setCommentaireClient(null);
        });
        Candidature premiere = choisies.getFirst();
        events.publier(Topics.SELECTION, Events.SHORTLIST_ENVOYEE, req.missionId(), new ShortlistEnvoyeeEvent(
                req.missionId(), premiere.getEntrepriseId(), premiere.getMissionIntitule(),
                premiere.getContactEmail(), choisies.stream().map(Candidature::getCandidatNom).toList()));
        return choisies.stream().map(CandidatureDto::of).toList();
    }

    @Transactional(readOnly = true)
    public List<CandidatureDto> parCandidat(UUID candidatId) {
        return candidatures.findByCandidatIdOrderByUpdatedAtDesc(candidatId).stream().map(CandidatureDto::of).toList();
    }

    /** Candidatures en cours, toutes missions confondues (regroupement « par mission »). */
    @Transactional(readOnly = true)
    public List<CandidatureDto> enCours() {
        return candidatures.findByEtapeNotInOrderByUpdatedAtDesc(EnumSet.of(Etape.REFUSE, Etape.RETIRE)).stream()
                .map(CandidatureDto::of).toList();
    }

    // ---------------- Espace entreprise ----------------

    @Transactional(readOnly = true)
    public List<ProfilPresenteDto> profilsPresentes(UUID missionId) {
        UUID entrepriseId = CurrentUser.hasRole(Roles.RECRUTEUR) ? null : CurrentUser.entrepriseId();
        return candidatures.findByMissionIdOrderByScoreDesc(missionId).stream()
                .filter(c -> VISIBLES_CLIENT.contains(c.getEtape()) || (c.getEtape() == Etape.REFUSE && c.getAvisClient() != null))
                .filter(c -> entrepriseId == null || c.getEntrepriseId().equals(entrepriseId))
                .map(ProfilPresenteDto::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfilPresenteDto> aEvaluer() {
        return candidatures.findByEntrepriseIdAndEtapeInOrderByPresenteLeDesc(CurrentUser.entrepriseId(),
                        EnumSet.of(Etape.PRESENTE)).stream()
                .filter(c -> c.getAvisClient() == null)
                .map(ProfilPresenteDto::of).toList();
    }

    public ProfilPresenteDto donnerAvis(UUID id, AvisRequest req) {
        Candidature c = charger(id);
        if (!c.getEntrepriseId().equals(CurrentUser.entrepriseId()) || !VISIBLES_CLIENT.contains(c.getEtape())) {
            throw new AccessDeniedException("Ce profil ne vous a pas été présenté");
        }
        c.setAvisClient(req.avis());
        c.setCommentaireClient(req.commentaire());
        if (req.avis() == AvisClient.REFUSE) {
            c.passerA(Etape.REFUSE);
            c.setMotifSortie("Refus client" + (req.commentaire() == null ? "" : " : " + req.commentaire()));
        } else {
            c.setUpdatedAt(OffsetDateTime.now());
        }
        events.publier(Topics.SELECTION, Events.RETOUR_CLIENT, c.getId(), new RetourClientEvent(c.getId(),
                c.getMissionIntitule(), c.getCandidatNom(), req.avis().name(), req.commentaire(), c.getMissionId(),
                c.getEntrepriseId(), c.getEntrepriseNom(), c.getCandidatId(), c.getCandidatEmail(), c.getContactEmail()));
        return ProfilPresenteDto.of(c);
    }

    /** Résumé par mission : alimente le tableau de bord recruteur et l'espace entreprise. */
    @Transactional(readOnly = true)
    public List<MissionResumeDto> resumeParMission() {
        List<Candidature> source = CurrentUser.hasRole(Roles.RECRUTEUR) ? candidatures.findAll()
                : candidatures.findAll().stream().filter(c -> c.getEntrepriseId().equals(CurrentUser.entrepriseId())).toList();
        Map<UUID, List<Candidature>> parMission = source.stream().collect(Collectors.groupingBy(Candidature::getMissionId));
        return parMission.entrySet().stream().map(e -> {
            List<Candidature> cs = e.getValue();
            return new MissionResumeDto(e.getKey(), cs.size(),
                    cs.stream().filter(c -> c.getPresenteLe() != null).count(),
                    cs.stream().filter(c -> !c.getEtape().estSortie() && c.getEtape() != Etape.PLACE).count(),
                    cs.stream().filter(c -> c.getEtape() == Etape.PRESENTE && c.getAvisClient() == null).count(),
                    cs.stream().filter(c -> c.getEtape() == Etape.PLACE).count());
        }).toList();
    }

    // ---------------- Espace candidat ----------------

    @Transactional(readOnly = true)
    public List<MaCandidatureDto> mesCandidatures() {
        return candidatures.findByCandidatEmailIgnoreCaseOrderByUpdatedAtDesc(CurrentUser.email()).stream()
                .map(MaCandidatureDto::of).toList();
    }

    /** Contexte d'une candidature pour agenda-service (appel interne, hors gateway). */
    @Transactional(readOnly = true)
    public ContexteReunionDto contexteReunion(UUID id) {
        Candidature c = charger(id);
        if (!CurrentUser.hasRole(Roles.RECRUTEUR) && !c.getEntrepriseId().equals(CurrentUser.entrepriseId())) {
            throw new AccessDeniedException("Ce candidat ne vous a pas été présenté");
        }
        return ContexteReunionDto.of(c);
    }

    // ---------------- Missions annulées (événements d'entreprise-service) ----------------

    @KafkaListener(topics = Topics.ENTREPRISE)
    public void recevoirEntreprise(ConsumerRecord<String, String> message) {
        if (Events.MISSION_ANNULEE.equals(recus.type(message))) {
            recus.traiter(message, MissionAnnuleeEvent.class, this::surMissionAnnulee);
        }
    }

    /** Mission annulée : les candidatures encore en cours sont retirées et leurs candidats prévenus. */
    void surMissionAnnulee(MissionAnnuleeEvent e) {
        List<String> emails = new java.util.ArrayList<>();
        for (Candidature c : candidatures.findByMissionIdOrderByScoreDesc(e.missionId())) {
            if (!c.getEtape().estSortie() && c.getEtape() != Etape.PLACE) {
                c.setMotifSortie("Mission annulée");
                c.passerA(Etape.RETIRE);
                if (c.getCandidatEmail() != null && !c.getCandidatEmail().isBlank()) {
                    emails.add(c.getCandidatEmail());
                }
            }
        }
        if (!emails.isEmpty()) {
            events.publier(Topics.SELECTION, Events.CANDIDATURES_CLOSES, e.missionId(),
                    new CandidaturesClosesEvent(e.missionId(), e.intitule(), emails));
        }
    }

    // ---------------- Profils supprimés (événements de candidat-service) ----------------

    @KafkaListener(topics = Topics.CANDIDAT)
    public void recevoirCandidat(ConsumerRecord<String, String> message) {
        if (Events.CANDIDAT_ANONYMISE.equals(recus.type(message))) {
            recus.traiter(message, CandidatAnonymiseEvent.class, this::surCandidatAnonymise);
        }
    }

    /** Droit à l'effacement : la copie de l'identité est anonymisée et les candidatures en cours sont retirées. */
    void surCandidatAnonymise(CandidatAnonymiseEvent e) {
        for (Candidature c : candidatures.findByCandidatIdOrderByUpdatedAtDesc(e.candidatId())) {
            c.setCandidatNom("Candidat anonymisé");
            c.setCandidatEmail(null);
            if (!c.getEtape().estSortie() && c.getEtape() != Etape.PLACE) {
                c.setMotifSortie("Profil supprimé par le candidat");
                c.passerA(Etape.RETIRE);
            }
        }
    }

    // ---------------- Réunions (événements d'agenda-service) ----------------

    @KafkaListener(topics = Topics.AGENDA)
    public void recevoir(ConsumerRecord<String, String> message) {
        switch (recus.type(message)) {
            case Events.REUNION_CONFIRMEE -> recus.traiter(message, ReunionConfirmeeEvent.class, this::surReunionConfirmee);
            case Events.REUNION_AVIS -> recus.traiter(message, ReunionAvisEvent.class, this::surAvis);
            default -> {
                // Les autres événements de l'agenda ne changent pas le pipeline.
            }
        }
    }

    /** Un entretien confirmé fait passer la candidature à l'étape d'entretien correspondante. */
    void surReunionConfirmee(ReunionConfirmeeEvent e) {
        if (e.candidatureId() == null) {
            return;
        }
        candidatures.findById(e.candidatureId()).ifPresent(c -> {
            if ("ENTRETIEN_CLIENT".equals(e.nature())) {
                if (c.getEtape() == Etape.PRESENTE) {
                    c.passerA(Etape.ENTRETIEN_CLIENT);
                }
            } else if (!"POINT_CLIENT".equals(e.nature()) && c.getEtape().ordinal() < Etape.ENTRETIEN_RECRUTEUR.ordinal()) {
                c.passerA(Etape.ENTRETIEN_RECRUTEUR);
            }
        });
    }

    /** L'évaluation du client est enregistrée sur la candidature, qui avance selon sa décision. */
    void surAvis(ReunionAvisEvent e) {
        Candidature c = e.candidatureId() == null ? null : candidatures.findById(e.candidatureId()).orElse(null);
        if (c == null) {
            log.warn("Avis reçu pour une candidature inconnue : {}", e.candidatureId());
            return;
        }
        c.setEvalTechnique(e.technique());
        c.setEvalCommunication(e.communication());
        c.setEvalMotivation(e.motivation());
        c.setEvalEquipe(e.adequationEquipe());
        c.setEvalDecision(e.decision());
        c.setCommentaireClient(e.commentaire());
        switch (e.decision()) {
            case "RETENIR" -> {
                c.setAvisClient(AvisClient.RETENU);
                if (c.getEtape().ordinal() < Etape.OFFRE.ordinal()) {
                    c.passerA(Etape.OFFRE);
                }
            }
            case "NE_PAS_RETENIR" -> {
                c.setAvisClient(AvisClient.REFUSE);
                c.passerA(Etape.REFUSE);
                c.setMotifSortie("Refus après entretien" + (e.commentaire() == null ? "" : " : " + e.commentaire()));
            }
            default -> {
                // Second entretien : la candidature reste à l'étape d'entretien, le recruteur replanifie.
                c.setAvisClient(AvisClient.A_RENCONTRER);
                c.setUpdatedAt(OffsetDateTime.now());
            }
        }
    }

    // ---------------- Statistiques ----------------

    @Transactional(readOnly = true)
    public SelectionStats stats() {
        List<Candidature> toutes = candidatures.findAll();
        List<EtapeEntonnoir> entonnoir = COLONNES.stream()
                .map(etape -> new EtapeEntonnoir(etape, etape.libelle(), toutes.stream()
                        .filter(c -> c.getEtapeMax() != null && c.getEtapeMax().ordinal() >= etape.ordinal()).count()))
                .toList();
        long presentes = toutes.stream().filter(c -> c.getPresenteLe() != null).count();
        List<Candidature> placees = toutes.stream().filter(c -> c.getPlaceLe() != null).toList();
        Double delaiPlacement = moyenneJours(placees, Candidature::getPlaceLe);
        Double delaiShortlist = moyenneJours(toutes.stream().filter(c -> c.getPresenteLe() != null).toList(),
                Candidature::getPresenteLe);
        // Les réunions sont dans agenda-service : on compte ici les candidatures en entretien client.
        long entretiensAVenir = toutes.stream().filter(c -> c.getEtape() == Etape.ENTRETIEN_CLIENT).count();
        long enAttente = toutes.stream().filter(c -> c.getEtape() == Etape.PRESENTE && c.getAvisClient() == null).count();
        return new SelectionStats(entonnoir, placees.size(),
                presentes == 0 ? 0 : Math.round(1000.0 * placees.size() / presentes) / 10.0,
                delaiPlacement, delaiShortlist, entretiensAVenir, enAttente,
                candidatures.findTop10ByAvisClientIsNotNullOrderByUpdatedAtDesc().stream().map(CandidatureDto::of).toList());
    }

    private static Double moyenneJours(List<Candidature> liste, Function<Candidature, OffsetDateTime> fin) {
        if (liste.isEmpty()) {
            return null;
        }
        double moyenne = liste.stream()
                .mapToDouble(c -> Duration.between(c.getCreatedAt(), fin.apply(c)).toHours() / 24.0)
                .average().orElse(0);
        return Math.round(moyenne * 10) / 10.0;
    }

    private static int score(MissionView m, CandidatView c) {
        return Matching.score(m.competencesRequises(), m.experienceMin(), m.ville(), m.salaireMax(),
                c.competences(), c.anneesExperience(), c.ville(), c.pretentionSalaire());
    }

    private Candidature charger(UUID id) {
        return candidatures.findById(id).orElseThrow(() -> new NotFoundException("Candidature introuvable"));
    }
}
