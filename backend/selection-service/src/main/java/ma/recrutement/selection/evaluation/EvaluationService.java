package ma.recrutement.selection.evaluation;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.TestEnvoyeEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.selection.domain.Candidature;
import ma.recrutement.selection.domain.Etape;
import ma.recrutement.selection.evaluation.EvaluationDtos.*;
import ma.recrutement.selection.repository.CandidatureRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Évaluations techniques intégrées (DAT, section 15) : banque de questions, modèles, envoi d'un test ou
 * ouverture d'une grille, passage par le candidat, correction automatique, notation et signaux d'intégrité.
 * Les réponses attendues ne sortent jamais vers le candidat ; la correction et le chronomètre sont côté serveur.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class EvaluationService {

    static final Set<String> NIVEAUX = Set.of("JUNIOR", "CONFIRME", "SENIOR");
    static final Set<String> SIGNAUX = Set.of("ONGLET", "FENETRE", "PLEIN_ECRAN", "COPIE", "COLLAGE");
    /** Délai de grâce après la fin du chronomètre (réseau lent). */
    static final Duration GRACE = Duration.ofSeconds(30);

    private final QuestionRepository questions;
    private final ModeleRepository modeles;
    private final ModeleElementRepository elements;
    private final EvaluationRepository evaluations;
    private final EvaluationQuestionRepository lignes;
    private final EvenementPassageRepository evenements;
    private final CandidatureRepository candidatures;
    private final EventPublisher events;

    @Value("${app.front-url:http://localhost:3000}")
    private String frontUrl;

    // =====================================================================
    // Banque de questions
    // =====================================================================

    @Transactional(readOnly = true)
    public List<QuestionDto> questions() {
        return questions.findByActiveTrueOrderByCompetenceAscCreatedAtDesc().stream().map(QuestionDto::of).toList();
    }

    public QuestionDto creerQuestion(QuestionRequest r) {
        Question q = new Question();
        q.setAuteur(CurrentUser.nom());
        appliquer(q, r);
        return QuestionDto.of(questions.save(q));
    }

    /** Une question de la plateforme n'est jamais modifiée : le recruteur obtient sa propre copie. */
    public QuestionDto modifierQuestion(UUID id, QuestionRequest r) {
        Question q = questions.findById(id).filter(Question::isActive).orElseThrow(() -> new NotFoundException("Question introuvable"));
        if (q.isPlateforme()) {
            Question copie = new Question();
            copie.setAuteur(CurrentUser.nom());
            appliquer(copie, r);
            return QuestionDto.of(questions.save(copie));
        }
        appliquer(q, r);
        return QuestionDto.of(q);
    }

    public void retirerQuestion(UUID id) {
        Question q = questions.findById(id).orElseThrow(() -> new NotFoundException("Question introuvable"));
        if (q.isPlateforme()) {
            throw new BusinessException("Les questions de la plateforme ne se suppriment pas");
        }
        q.setActive(false);
    }

    private void appliquer(Question q, QuestionRequest r) {
        String type = r.type().strip().toUpperCase();
        if (!Correction.TYPES.contains(type)) {
            throw new BusinessException("Type de question inconnu : " + r.type());
        }
        String niveau = r.niveau().strip().toUpperCase();
        if (!NIVEAUX.contains(niveau)) {
            throw new BusinessException("Niveau inconnu : " + r.niveau());
        }
        List<String> choix = r.choix() == null ? List.of() : r.choix().stream().map(String::strip).filter(c -> !c.isEmpty()).toList();
        String attendues = r.attendues() == null ? null : r.attendues().strip();
        if (Correction.A_CHOIX.contains(type)) {
            if (choix.size() < 2 || choix.size() > 8) {
                throw new BusinessException("Donnez entre 2 et 8 choix");
            }
            Set<Integer> bonnes;
            try {
                bonnes = Correction.indices(attendues);
            } catch (NumberFormatException e) {
                throw new BusinessException("Bonnes réponses illisibles");
            }
            if (bonnes.isEmpty() || bonnes.stream().anyMatch(i -> i < 0 || i >= choix.size())) {
                throw new BusinessException("Marquez au moins une bonne réponse parmi les choix");
            }
            if (!"QCM_MULTI".equals(type) && bonnes.size() != 1) {
                throw new BusinessException("Cette question n'a qu'une seule bonne réponse");
            }
            attendues = bonnes.stream().map(String::valueOf).collect(Collectors.joining(","));
        } else if ("COURTE".equals(type)) {
            if (attendues == null || attendues.isBlank()) {
                throw new BusinessException("Indiquez au moins une réponse acceptée");
            }
        } else {
            attendues = null;
        }
        q.setType(type);
        q.setEnonce(r.enonce().strip());
        q.setCode(vide(r.code()));
        q.setLangage(vide(r.langage()));
        q.setChoix(Correction.A_CHOIX.contains(type) ? String.join("\n", choix) : null);
        q.setAttendues(attendues);
        q.setIndice(vide(r.indice()));
        q.setExplication(vide(r.explication()));
        q.setCompetence(r.competence().strip());
        q.setNiveau(niveau);
        q.setPoints(r.points());
    }

    // =====================================================================
    // Modèles
    // =====================================================================

    @Transactional(readOnly = true)
    public List<ModeleDto> modeles() {
        Map<UUID, Question> parId = questions.findAll().stream().collect(Collectors.toMap(Question::getId, Function.identity()));
        return modeles.findAllByOrderByModeAscIntituleAsc().stream().map(m -> dto(m, parId)).toList();
    }

    public ModeleDto creerModele(ModeleRequest r) {
        Modele m = new Modele();
        m.setAuteur(CurrentUser.nom());
        appliquer(m, r);
        modeles.save(m);
        remplacerElements(m, r);
        return dto(m, questionsParId());
    }

    public ModeleDto modifierModele(UUID id, ModeleRequest r) {
        Modele m = modeles.findById(id).orElseThrow(() -> new NotFoundException("Modèle introuvable"));
        appliquer(m, r);
        remplacerElements(m, r);
        return dto(m, questionsParId());
    }

    private void appliquer(Modele m, ModeleRequest r) {
        String mode = r.mode().strip().toUpperCase();
        if (!Modele.TEST.equals(mode) && !Modele.GRILLE.equals(mode)) {
            throw new BusinessException("Mode inconnu : " + r.mode());
        }
        if (Modele.TEST.equals(mode) && r.dureeMinutes() == null) {
            throw new BusinessException("Indiquez la durée du test");
        }
        m.setMode(mode);
        m.setIntitule(r.intitule().strip());
        m.setCompetences(vide(r.competences()));
        m.setDureeMinutes(r.dureeMinutes());
        m.setSeuil(r.seuil());
        m.setDelaiJours(r.delaiJours());
        m.setMelanger(r.melanger());
        m.setIndices(r.indices());
        m.setScoreVisible(r.scoreVisible());
        m.setPleinEcran(r.pleinEcran());
        m.setSignaux(r.signaux());
        m.setAlerteSorties(r.alerteSorties());
        m.setAlerteSecondes(r.alerteSecondes());
    }

    private void remplacerElements(Modele m, ModeleRequest r) {
        elements.deleteByModeleId(m.getId());
        elements.flush();
        int ordre = 1;
        for (ElementRequest e : r.elements()) {
            ModeleElement el = new ModeleElement();
            el.setModeleId(m.getId());
            el.setOrdre(ordre++);
            if (Modele.GRILLE.equals(m.getMode())) {
                if (e.libelle() == null || e.libelle().isBlank()) {
                    throw new BusinessException("Chaque critère de la grille a un libellé");
                }
                el.setLibelle(e.libelle().strip());
                el.setGuides(vide(e.guides()));
                el.setPoids(e.poids() == null ? 1 : e.poids());
                el.setCompetence(vide(e.competence()) == null ? e.libelle().strip() : e.competence().strip());
            } else if (e.questionId() != null) {
                Question q = questions.findById(e.questionId()).filter(Question::isActive)
                        .orElseThrow(() -> new BusinessException("Une question du modèle n'existe plus"));
                el.setQuestionId(q.getId());
            } else {
                if (e.competence() == null || e.competence().isBlank() || e.nombre() == null) {
                    throw new BusinessException("Un tirage précise la compétence et le nombre de questions");
                }
                el.setCompetence(e.competence().strip());
                el.setNiveau(vide(e.niveau()) == null ? null : e.niveau().strip().toUpperCase());
                el.setNombre(e.nombre());
            }
            elements.save(el);
        }
    }

    private ModeleDto dto(Modele m, Map<UUID, Question> parId) {
        List<ModeleElement> els = elements.findByModeleIdOrderByOrdre(m.getId());
        int nombre = 0;
        int points = 0;
        List<ElementDto> dtos = new ArrayList<>();
        for (ModeleElement e : els) {
            Question q = e.getQuestionId() == null ? null : parId.get(e.getQuestionId());
            if (q != null) {
                nombre++;
                points += q.getPoints();
            } else if (e.getNombre() != null) {
                nombre += e.getNombre();
                points += e.getNombre();
            } else if (e.getLibelle() != null) {
                nombre++;
                points += e.getPoids() == null ? 1 : e.getPoids();
            }
            dtos.add(new ElementDto(e.getId(), e.getQuestionId(), q == null ? null : q.getEnonce(), e.getCompetence(), e.getNiveau(),
                    e.getNombre(), e.getLibelle(), EvaluationDtos.lignes(e.getGuides()), e.getPoids()));
        }
        List<String> comp = m.getCompetences() == null ? List.of()
                : List.of(m.getCompetences().split(",")).stream().map(String::strip).filter(s -> !s.isEmpty()).toList();
        return new ModeleDto(m.getId(), m.getMode(), m.getIntitule(), comp, m.getDureeMinutes(), m.getSeuil(), m.getDelaiJours(),
                m.isMelanger(), m.isIndices(), m.isScoreVisible(), m.isPleinEcran(), m.isSignaux(), m.getAlerteSorties(),
                m.getAlerteSecondes(), m.getAuteur(), m.getUtilisations(), nombre, points, dtos);
    }

    private Map<UUID, Question> questionsParId() {
        return questions.findAll().stream().collect(Collectors.toMap(Question::getId, Function.identity()));
    }

    // =====================================================================
    // Envoi d'un test, ouverture d'une grille (recruteur)
    // =====================================================================

    public EvaluationResume envoyer(UUID candidatureId, EnvoiRequest r) {
        Candidature c = candidatures.findById(candidatureId).orElseThrow(() -> new NotFoundException("Candidature introuvable"));
        if (c.getEtape().estSortie() || c.getEtape() == Etape.PLACE) {
            throw new BusinessException("Cette candidature est close");
        }
        Modele m = modeles.findById(r.modeleId()).orElseThrow(() -> new NotFoundException("Modèle introuvable"));
        boolean test = Modele.TEST.equals(m.getMode());
        if (test && (c.getCandidatEmail() == null || c.getCandidatEmail().isBlank())) {
            throw new BusinessException("Ce candidat n'a pas d'adresse e-mail : impossible de lui envoyer le test");
        }
        Evaluation e = new Evaluation();
        e.setCandidatureId(candidatureId);
        e.setModeleId(m.getId());
        e.setMode(m.getMode());
        e.setIntitule(m.getIntitule());
        e.setStatut(test ? Evaluation.ENVOYEE : Evaluation.EN_COURS);
        e.setDureeMinutes(m.getDureeMinutes());
        e.setSeuil(m.getSeuil());
        e.setIndices(m.isIndices());
        e.setScoreVisible(m.isScoreVisible());
        e.setPleinEcran(m.isPleinEcran());
        e.setSignaux(m.isSignaux());
        e.setAlerteSorties(m.getAlerteSorties());
        e.setAlerteSecondes(m.getAlerteSecondes());
        e.setMessage(vide(r.message()));
        if (test) {
            e.setDateLimite(r.dateLimite() != null ? r.dateLimite() : LocalDate.now().plusDays(m.getDelaiJours()));
        } else {
            e.setDebut(OffsetDateTime.now());
        }
        evaluations.save(e);
        List<EvaluationQuestion> copie = test ? tirerQuestions(m, e) : criteres(m, e);
        if (copie.isEmpty()) {
            throw new BusinessException("Ce modèle ne donne aucune question : vérifiez ses tirages et la banque");
        }
        lignes.saveAll(copie);
        m.setUtilisations(m.getUtilisations() + 1);
        if (test) {
            events.publier(Topics.SELECTION, Events.TEST_ENVOYE, e.getId(), new TestEnvoyeEvent(candidatureId, c.getCandidatNom(),
                    c.getCandidatEmail(), c.getMissionIntitule(), e.getIntitule(), e.getDureeMinutes(),
                    frontUrl + "/candidat/tests/" + e.getId(), e.getDateLimite(), e.getMessage()));
        }
        return resume(e, c, copie, List.of());
    }

    /** Copie figée des questions : questions fixes, puis tirages au hasard, ordre et choix mélangés si demandé. */
    private List<EvaluationQuestion> tirerQuestions(Modele m, Evaluation e) {
        List<Question> retenues = new ArrayList<>();
        Set<UUID> deja = new HashSet<>();
        for (ModeleElement el : elements.findByModeleIdOrderByOrdre(m.getId())) {
            if (el.getQuestionId() != null) {
                questions.findById(el.getQuestionId()).filter(Question::isActive).filter(q -> deja.add(q.getId())).ifPresent(retenues::add);
            } else if (el.getCompetence() != null && el.getNombre() != null) {
                List<Question> pool = new ArrayList<>(questions.findByActiveTrueAndCompetenceIgnoreCase(el.getCompetence()).stream()
                        .filter(q -> el.getNiveau() == null || el.getNiveau().equals(q.getNiveau()))
                        .filter(q -> !deja.contains(q.getId())).toList());
                Collections.shuffle(pool);
                pool.stream().limit(el.getNombre()).forEach(q -> {
                    deja.add(q.getId());
                    retenues.add(q);
                });
            }
        }
        if (m.isMelanger()) {
            Collections.shuffle(retenues);
        }
        List<EvaluationQuestion> copie = new ArrayList<>();
        int ordre = 1;
        for (Question q : retenues) {
            q.setUtilisations(q.getUtilisations() + 1);
            EvaluationQuestion l = new EvaluationQuestion();
            l.setEvaluationId(e.getId());
            l.setOrdre(ordre++);
            l.setType(q.getType());
            l.setEnonce(q.getEnonce());
            l.setCode(q.getCode());
            l.setLangage(q.getLangage());
            l.setIndice(q.getIndice());
            l.setExplication(q.getExplication());
            l.setCompetence(q.getCompetence());
            l.setPoints(q.getPoints());
            l.setChoix(q.getChoix());
            l.setAttendues(q.getAttendues());
            if (m.isMelanger() && Correction.A_CHOIX.contains(q.getType())) {
                melangerChoix(l);
            }
            copie.add(l);
        }
        return copie;
    }

    /** Mélange les choix d'une question et recalcule les indices des bonnes réponses. */
    static void melangerChoix(EvaluationQuestion l) {
        List<String> choix = EvaluationDtos.lignes(l.getChoix());
        List<Integer> ordre = new ArrayList<>();
        for (int i = 0; i < choix.size(); i++) {
            ordre.add(i);
        }
        Collections.shuffle(ordre);
        Set<Integer> bonnes = Correction.indices(l.getAttendues());
        List<String> nouveaux = new ArrayList<>();
        Set<Integer> nouvellesBonnes = new java.util.TreeSet<>();
        for (int i = 0; i < ordre.size(); i++) {
            nouveaux.add(choix.get(ordre.get(i)));
            if (bonnes.contains(ordre.get(i))) {
                nouvellesBonnes.add(i);
            }
        }
        l.setChoix(String.join("\n", nouveaux));
        l.setAttendues(nouvellesBonnes.stream().map(String::valueOf).collect(Collectors.joining(",")));
    }

    private List<EvaluationQuestion> criteres(Modele m, Evaluation e) {
        List<EvaluationQuestion> copie = new ArrayList<>();
        for (ModeleElement el : elements.findByModeleIdOrderByOrdre(m.getId())) {
            if (el.getLibelle() == null) {
                continue;
            }
            EvaluationQuestion l = new EvaluationQuestion();
            l.setEvaluationId(e.getId());
            l.setOrdre(el.getOrdre());
            l.setType(EvaluationQuestion.CRITERE);
            l.setEnonce(el.getLibelle());
            l.setCode(el.getGuides());
            l.setCompetence(el.getCompetence() == null ? el.getLibelle() : el.getCompetence());
            l.setPoints(el.getPoids() == null ? 1 : el.getPoids());
            copie.add(l);
        }
        return copie;
    }

    // =====================================================================
    // Suivi, résultats et notation (recruteur)
    // =====================================================================

    @Transactional(readOnly = true)
    public List<EvaluationResume> evaluationsDe(UUID candidatureId) {
        Candidature c = candidatures.findById(candidatureId).orElseThrow(() -> new NotFoundException("Candidature introuvable"));
        return evaluations.findByCandidatureIdOrderByEnvoyeeLeDesc(candidatureId).stream()
                .map(e -> resume(e, c, lignes.findByEvaluationIdOrderByOrdre(e.getId()), evenements.findByEvaluationIdOrderByDebut(e.getId())))
                .toList();
    }

    /** Les 100 dernières évaluations, pour l'onglet Résultats. */
    @Transactional(readOnly = true)
    public List<EvaluationResume> recentes() {
        List<Evaluation> liste = evaluations.findTop100ByOrderByEnvoyeeLeDesc();
        Map<UUID, Candidature> parId = candidatures.findAllById(liste.stream().map(Evaluation::getCandidatureId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Candidature::getId, Function.identity()));
        return liste.stream().filter(e -> parId.containsKey(e.getCandidatureId()))
                .map(e -> resume(e, parId.get(e.getCandidatureId()), lignes.findByEvaluationIdOrderByOrdre(e.getId()),
                        evenements.findByEvaluationIdOrderByDebut(e.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public EvaluationDetail detail(UUID id) {
        Evaluation e = charger(id);
        Candidature c = candidatures.findById(e.getCandidatureId()).orElseThrow(() -> new NotFoundException("Candidature introuvable"));
        List<EvaluationQuestion> ls = lignes.findByEvaluationIdOrderByOrdre(id);
        List<EvenementPassage> evs = evenements.findByEvaluationIdOrderByDebut(id);
        List<LigneResultat> resultats = ls.stream().map(l -> new LigneResultat(l.getId(), l.getOrdre(), l.getType(), l.getEnonce(),
                l.getCode(), l.getLangage(), EvaluationDtos.lignes(l.getChoix()), l.getAttendues(), l.getExplication(),
                l.getCompetence(), l.getPoints(), l.getReponse(), l.getCorrecte(), l.getPointsObtenus(), l.getTempsMs(),
                l.isAVerifier(), motif(l, evs))).toList();
        List<EvenementDto> evDtos = evs.stream()
                .map(v -> new EvenementDto(v.getOrdre(), v.getType(), v.getDebut(), v.getDureeMs(), v.getLongueur())).toList();
        return new EvaluationDetail(resume(e, c, ls, evs), e.getCommentaire(), resultats, evDtos);
    }

    /** Note des questions ouvertes (points) ou des critères de grille (1 à 5), puis recalcul du score. */
    public EvaluationDetail noter(UUID id, NotesRequest r) {
        Evaluation e = charger(id);
        if (Evaluation.ENVOYEE.equals(e.getStatut()) || Evaluation.COMMENCEE.equals(e.getStatut())) {
            throw new BusinessException("Le candidat n'a pas encore terminé ce test");
        }
        Map<UUID, EvaluationQuestion> parId = lignes.findByEvaluationIdOrderByOrdre(id).stream()
                .collect(Collectors.toMap(EvaluationQuestion::getId, Function.identity()));
        for (NoteRequest n : r.notes()) {
            EvaluationQuestion l = parId.get(n.ligneId());
            if (l == null) {
                throw new NotFoundException("Ligne introuvable dans cette évaluation");
            }
            if (EvaluationQuestion.CRITERE.equals(l.getType())) {
                int note = n.valeur().intValue();
                if (note < 1 || note > 5) {
                    throw new BusinessException("Un critère se note de 1 à 5");
                }
                l.setPointsObtenus(Correction.pointsCritere(note, l.getPoints()));
                l.setReponse(vide(n.commentaire()));
                l.setReponduLe(OffsetDateTime.now());
            } else if ("OUVERTE".equals(l.getType())) {
                if (n.valeur().compareTo(BigDecimal.valueOf(l.getPoints())) > 0) {
                    throw new BusinessException("Au plus " + l.getPoints() + " points pour cette question");
                }
                l.setPointsObtenus(n.valeur());
            } else {
                throw new BusinessException("Les questions à choix sont corrigées automatiquement");
            }
        }
        if (r.commentaire() != null) {
            e.setCommentaire(vide(r.commentaire()));
        }
        List<EvaluationQuestion> ls = new ArrayList<>(parId.values());
        boolean toutNote = ls.stream().noneMatch(l -> l.getPointsObtenus() == null && l.getCorrecte() == null);
        if (Modele.GRILLE.equals(e.getMode())) {
            if (r.terminer()) {
                if (!toutNote) {
                    throw new BusinessException("Notez tous les critères avant de terminer l'entretien");
                }
                e.setFin(OffsetDateTime.now());
                e.setStatut(Evaluation.CORRIGEE);
            }
        } else if (toutNote) {
            e.setStatut(Evaluation.CORRIGEE);
        }
        calculer(e, ls);
        return detail(id);
    }

    // =====================================================================
    // Passage (candidat)
    // =====================================================================

    public List<MonTest> mesTests() {
        List<Candidature> mes = mesCandidatures();
        Map<UUID, Candidature> parId = mes.stream().collect(Collectors.toMap(Candidature::getId, Function.identity()));
        if (parId.isEmpty()) {
            return List.of();
        }
        return evaluations.findByCandidatureIdInOrderByEnvoyeeLeDesc(parId.keySet()).stream()
                .filter(e -> Modele.TEST.equals(e.getMode()))
                .peek(this::cloturerSiDepasse)
                .map(e -> {
                    Candidature c = parId.get(e.getCandidatureId());
                    boolean fini = Evaluation.CORRIGEE.equals(e.getStatut()) || Evaluation.A_CORRIGER.equals(e.getStatut());
                    return new MonTest(e.getId(), e.getIntitule(), c.getMissionIntitule(), c.getEntrepriseNom(), e.getStatut(),
                            lignes.findByEvaluationIdOrderByOrdre(e.getId()).size(), e.getDureeMinutes(), e.getDateLimite(),
                            e.getEnvoyeeLe(), e.getFin(), fini && e.isScoreVisible() ? e.getScore() : null, e.getMessage(),
                            e.isPleinEcran());
                })
                .toList();
    }

    /** État du passage : démarre le chronomètre au premier appel si {@code demarrer}. */
    public Passage passage(UUID id, boolean demarrer) {
        Evaluation e = monEvaluation(id);
        cloturerSiDepasse(e);
        if (demarrer && Evaluation.ENVOYEE.equals(e.getStatut())) {
            e.setDebut(OffsetDateTime.now());
            e.setStatut(Evaluation.COMMENCEE);
        }
        Candidature c = candidatures.findById(e.getCandidatureId()).orElseThrow();
        boolean enCours = Evaluation.COMMENCEE.equals(e.getStatut());
        List<QuestionPassage> qs = !enCours ? List.of() : lignes.findByEvaluationIdOrderByOrdre(id).stream()
                .map(l -> new QuestionPassage(l.getOrdre(), l.getType(), l.getEnonce(), l.getCode(), l.getLangage(),
                        EvaluationDtos.lignes(l.getChoix()), e.isIndices() ? l.getIndice() : null, l.getCompetence(), l.getReponse()))
                .toList();
        return new Passage(e.getId(), e.getIntitule(), c.getMissionIntitule(), c.getEntrepriseNom(), e.getStatut(), e.getDebut(),
                enCours ? secondesRestantes(e) : 0, e.isPleinEcran(), e.isSignaux(), qs);
    }

    public void repondre(UUID id, int ordre, ReponseRequest r) {
        Evaluation e = monEvaluation(id);
        if (cloturerSiDepasse(e)) {
            throw new BusinessException("Le temps est écoulé : vos réponses précédentes sont enregistrées");
        }
        if (!Evaluation.COMMENCEE.equals(e.getStatut())) {
            throw new BusinessException("Ce test n'est pas en cours");
        }
        EvaluationQuestion l = lignes.findByEvaluationIdOrderByOrdre(id).stream().filter(x -> x.getOrdre() == ordre).findFirst()
                .orElseThrow(() -> new NotFoundException("Question introuvable"));
        l.setReponse(r.reponse() == null ? null : r.reponse().strip());
        if (r.tempsMs() != null) {
            l.setTempsMs((l.getTempsMs() == null ? 0 : l.getTempsMs()) + r.tempsMs());
        }
        l.setReponduLe(OffsetDateTime.now());
    }

    public void signaler(UUID id, List<EvenementRequest> liste) {
        Evaluation e = monEvaluation(id);
        if (!e.isSignaux() || !Evaluation.COMMENCEE.equals(e.getStatut())) {
            return;
        }
        for (EvenementRequest r : liste.stream().limit(200).toList()) {
            String type = r.type().strip().toUpperCase();
            if (!SIGNAUX.contains(type)) {
                continue;
            }
            EvenementPassage v = new EvenementPassage();
            v.setEvaluationId(id);
            v.setOrdre(r.ordre());
            v.setType(type);
            v.setDebut(r.debut());
            v.setDureeMs(r.dureeMs());
            v.setLongueur(r.longueur());
            evenements.save(v);
        }
    }

    public Fin terminer(UUID id) {
        Evaluation e = monEvaluation(id);
        if (Evaluation.COMMENCEE.equals(e.getStatut())) {
            clore(e);
        } else if (!Evaluation.A_CORRIGER.equals(e.getStatut()) && !Evaluation.CORRIGEE.equals(e.getStatut())) {
            throw new BusinessException("Ce test n'est pas en cours");
        }
        boolean visible = e.isScoreVisible();
        return new Fin(e.getStatut(), visible ? e.getScore() : null,
                visible ? Correction.decoder(e.getScoresCompetences()) : Map.of(), Evaluation.A_CORRIGER.equals(e.getStatut()));
    }

    // =====================================================================
    // Correction et calculs
    // =====================================================================

    /** Corrige les réponses, repère celles à vérifier, calcule le score et clôt le test. */
    private void clore(Evaluation e) {
        List<EvaluationQuestion> ls = lignes.findByEvaluationIdOrderByOrdre(e.getId());
        List<EvenementPassage> evs = evenements.findByEvaluationIdOrderByDebut(e.getId());
        for (EvaluationQuestion l : ls) {
            Boolean ok = Correction.corriger(l.getType(), l.getAttendues(), l.getReponse());
            l.setCorrecte(ok);
            if (ok != null) {
                l.setPointsObtenus(Correction.points(ok, l.getPoints()));
            }
            l.setAVerifier(motif(l, evs) != null);
        }
        e.setFin(OffsetDateTime.now());
        boolean aNoter = ls.stream().anyMatch(l -> l.getCorrecte() == null && l.getPointsObtenus() == null);
        e.setStatut(aNoter ? Evaluation.A_CORRIGER : Evaluation.CORRIGEE);
        calculer(e, ls);
    }

    private void calculer(Evaluation e, List<EvaluationQuestion> ls) {
        List<Correction.Ligne> lignesScore = ls.stream()
                .map(l -> new Correction.Ligne(l.getCompetence(), l.getPoints(), l.getPointsObtenus())).toList();
        e.setScore(Correction.score(lignesScore));
        e.setScoresCompetences(Correction.encoder(Correction.scoresParCompetence(lignesScore)));
        if (Evaluation.CORRIGEE.equals(e.getStatut()) && e.getScore() != null) {
            candidatures.findById(e.getCandidatureId()).ifPresent(c -> c.setScoreTest(e.getScore()));
        }
    }

    /** Une bonne réponse donnée après plus de 10 s hors de la page, ou un texte collé, est à vérifier à l'oral. */
    static String motif(EvaluationQuestion l, List<EvenementPassage> evs) {
        for (EvenementPassage v : evs) {
            if (v.getOrdre() == null || v.getOrdre() != l.getOrdre()) {
                continue;
            }
            if ("COLLAGE".equals(v.getType()) && v.getLongueur() != null && v.getLongueur() >= 20) {
                return "Texte collé (" + v.getLongueur() + " caractères)";
            }
            boolean sortie = "ONGLET".equals(v.getType()) || "FENETRE".equals(v.getType());
            if (sortie && v.getDureeMs() != null && v.getDureeMs() >= 10_000 && Boolean.TRUE.equals(l.getCorrecte())) {
                return "Bonne réponse après " + (v.getDureeMs() / 1000) + " s hors de la page";
            }
        }
        return null;
    }

    /** Clôt un test dont le temps ou la date limite est dépassé. @return vrai s'il vient d'être clos. */
    private boolean cloturerSiDepasse(Evaluation e) {
        if (Evaluation.ENVOYEE.equals(e.getStatut()) && e.getDateLimite() != null && LocalDate.now().isAfter(e.getDateLimite())) {
            e.setStatut(Evaluation.EXPIREE);
            return true;
        }
        if (Evaluation.COMMENCEE.equals(e.getStatut()) && e.getDureeMinutes() != null && e.getDebut() != null
                && OffsetDateTime.now().isAfter(e.getDebut().plusMinutes(e.getDureeMinutes()).plus(GRACE))) {
            clore(e);
            return true;
        }
        return false;
    }

    private static long secondesRestantes(Evaluation e) {
        if (e.getDureeMinutes() == null || e.getDebut() == null) {
            return 0;
        }
        long s = Duration.between(OffsetDateTime.now(), e.getDebut().plusMinutes(e.getDureeMinutes())).toSeconds();
        return Math.max(0, s);
    }

    private EvaluationResume resume(Evaluation e, Candidature c, List<EvaluationQuestion> ls, List<EvenementPassage> evs) {
        int sorties = 0;
        long ms = 0;
        int collages = 0;
        for (EvenementPassage v : evs) {
            switch (v.getType()) {
                case "ONGLET", "FENETRE", "PLEIN_ECRAN" -> {
                    sorties++;
                    ms += v.getDureeMs() == null ? 0 : v.getDureeMs();
                }
                case "COLLAGE" -> collages++;
                default -> {
                }
            }
        }
        long secondes = ms / 1000;
        int aVerifier = (int) ls.stream().filter(EvaluationQuestion::isAVerifier).count();
        boolean alerte = sorties >= e.getAlerteSorties() || secondes >= e.getAlerteSecondes() || collages > 0;
        int aNoter = (int) ls.stream().filter(l -> l.getCorrecte() == null && l.getPointsObtenus() == null).count();
        boolean termine = !Evaluation.ENVOYEE.equals(e.getStatut()) && !Evaluation.COMMENCEE.equals(e.getStatut());
        return new EvaluationResume(e.getId(), e.getCandidatureId(), c.getCandidatNom(), c.getMissionIntitule(), e.getMode(),
                e.getIntitule(), e.getStatut(), e.getDureeMinutes(), e.getDateLimite(), e.getEnvoyeeLe(), e.getDebut(), e.getFin(),
                e.getScore(), e.getSeuil(), Correction.decoder(e.getScoresCompetences()), termine ? aNoter : 0,
                new Integrite(sorties, secondes, collages, aVerifier, alerte));
    }

    private Evaluation charger(UUID id) {
        return evaluations.findById(id).orElseThrow(() -> new NotFoundException("Évaluation introuvable"));
    }

    private List<Candidature> mesCandidatures() {
        String email = CurrentUser.email();
        if (email == null || email.isBlank()) {
            return List.of();
        }
        return candidatures.findByCandidatEmailIgnoreCaseOrderByUpdatedAtDesc(email);
    }

    /** Le candidat ne voit que ses propres tests (adresse e-mail du jeton) ; jamais une grille d'entretien. */
    private Evaluation monEvaluation(UUID id) {
        Evaluation e = charger(id);
        Set<UUID> miennes = mesCandidatures().stream().map(Candidature::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        if (!miennes.contains(e.getCandidatureId()) || !Modele.TEST.equals(e.getMode())) {
            throw new AccessDeniedException("Ce test ne vous est pas destiné");
        }
        return e;
    }

    private static String vide(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
