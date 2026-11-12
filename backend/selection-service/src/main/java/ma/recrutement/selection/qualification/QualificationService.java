package ma.recrutement.selection.qualification;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.ReferenceDemandeeEvent;
import ma.recrutement.common.events.TestEnvoyeEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.selection.domain.Candidature;
import ma.recrutement.selection.domain.Etape;
import ma.recrutement.selection.repository.CandidatureRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Préqualification d'une candidature : tests techniques (passés sur une plateforme externe, score saisi
 * par le recruteur) et références (le référent est prévenu par e-mail, le recruteur saisit son retour).
 * Le dernier score et le nombre de références sont recopiés sur la candidature.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class QualificationService {

    private static final Set<String> LIENS = Set.of("MANAGER", "COLLEGUE", "CLIENT");

    private final CandidatureRepository candidatures;
    private final TestTechniqueRepository tests;
    private final ReferenceCandidatRepository references;
    private final EventPublisher events;

    public record TestDto(UUID id, String intitule, Integer dureeMinutes, String lien, String message,
                          LocalDate dateLimite, String statut, Integer score, String commentaire,
                          OffsetDateTime envoyeLe, OffsetDateTime corrigeLe) {
        static TestDto of(TestTechnique t) {
            return new TestDto(t.getId(), t.getIntitule(), t.getDureeMinutes(), t.getLien(), t.getMessage(),
                    t.getDateLimite(), t.getStatut(), t.getScore(), t.getCommentaire(), t.getEnvoyeLe(), t.getCorrigeLe());
        }
    }

    public record ReferenceDto(UUID id, String nom, String email, String telephone, String fonction, String lien,
                               String statut, String avis, Boolean recommande, OffsetDateTime demandeeLe,
                               OffsetDateTime relanceeLe, OffsetDateTime recueLe) {
        static ReferenceDto of(ReferenceCandidat r) {
            return new ReferenceDto(r.getId(), r.getNom(), r.getEmail(), r.getTelephone(), r.getFonction(), r.getLien(),
                    r.getStatut(), r.getAvis(), r.getRecommande(), r.getDemandeeLe(), r.getRelanceeLe(), r.getRecueLe());
        }
    }

    public record QualificationDto(List<TestDto> tests, List<ReferenceDto> references) {
    }

    @Transactional(readOnly = true)
    public QualificationDto qualification(UUID candidatureId) {
        charger(candidatureId);
        return new QualificationDto(
                tests.findByCandidatureIdOrderByEnvoyeLeDesc(candidatureId).stream().map(TestDto::of).toList(),
                references.findByCandidatureIdOrderByDemandeeLeAsc(candidatureId).stream().map(ReferenceDto::of).toList());
    }

    public TestDto envoyerTest(UUID candidatureId, String intitule, Integer duree, String lien, LocalDate dateLimite, String message) {
        Candidature c = enCours(candidatureId);
        if (c.getCandidatEmail() == null || c.getCandidatEmail().isBlank()) {
            throw new BusinessException("Ce candidat n'a pas d'adresse e-mail : impossible de lui envoyer le test");
        }
        TestTechnique t = new TestTechnique();
        t.setCandidatureId(candidatureId);
        t.setIntitule(intitule.strip());
        t.setDureeMinutes(duree);
        t.setLien(vide(lien));
        t.setDateLimite(dateLimite);
        t.setMessage(vide(message));
        tests.save(t);
        events.publier(Topics.SELECTION, Events.TEST_ENVOYE, t.getId(), new TestEnvoyeEvent(candidatureId, c.getCandidatNom(),
                c.getCandidatEmail(), c.getMissionIntitule(), t.getIntitule(), duree, t.getLien(), dateLimite, t.getMessage()));
        return TestDto.of(t);
    }

    public TestDto corrigerTest(UUID candidatureId, UUID testId, int score, String commentaire) {
        Candidature c = charger(candidatureId);
        TestTechnique t = tests.findById(testId).filter(x -> x.getCandidatureId().equals(candidatureId))
                .orElseThrow(() -> new NotFoundException("Test introuvable"));
        t.setScore(Math.max(0, Math.min(100, score)));
        t.setCommentaire(vide(commentaire));
        t.setStatut(TestTechnique.CORRIGE);
        t.setCorrigeLe(OffsetDateTime.now());
        c.setScoreTest(t.getScore());
        return TestDto.of(t);
    }

    public ReferenceDto demanderReference(UUID candidatureId, String nom, String email, String telephone, String fonction,
                                          String lien, boolean accordCandidat) {
        if (!accordCandidat) {
            throw new BusinessException("L'accord du candidat est nécessaire pour contacter un référent");
        }
        if (!LIENS.contains(lien)) {
            throw new BusinessException("Lien avec le candidat inconnu : " + lien);
        }
        Candidature c = enCours(candidatureId);
        ReferenceCandidat r = new ReferenceCandidat();
        r.setCandidatureId(candidatureId);
        r.setNom(nom.strip());
        r.setEmail(vide(email));
        r.setTelephone(vide(telephone));
        r.setFonction(vide(fonction));
        r.setLien(lien);
        references.save(r);
        c.setReferencesDemandees(c.getReferencesDemandees() + 1);
        prevenir(c, r, false);
        return ReferenceDto.of(r);
    }

    public ReferenceDto relancerReference(UUID candidatureId, UUID referenceId) {
        Candidature c = charger(candidatureId);
        ReferenceCandidat r = reference(candidatureId, referenceId);
        if (ReferenceCandidat.RECUE.equals(r.getStatut())) {
            throw new BusinessException("Cette référence a déjà été reçue");
        }
        r.setRelanceeLe(OffsetDateTime.now());
        prevenir(c, r, true);
        return ReferenceDto.of(r);
    }

    public ReferenceDto saisirRetour(UUID candidatureId, UUID referenceId, String avis, Boolean recommande) {
        Candidature c = charger(candidatureId);
        ReferenceCandidat r = reference(candidatureId, referenceId);
        if (!ReferenceCandidat.RECUE.equals(r.getStatut())) {
            c.setReferencesRecues(c.getReferencesRecues() + 1);
        }
        r.setAvis(vide(avis));
        r.setRecommande(recommande);
        r.setStatut(ReferenceCandidat.RECUE);
        r.setRecueLe(OffsetDateTime.now());
        return ReferenceDto.of(r);
    }

    private void prevenir(Candidature c, ReferenceCandidat r, boolean relance) {
        if (r.getEmail() != null) {
            events.publier(Topics.SELECTION, Events.REFERENCE_DEMANDEE, r.getId(), new ReferenceDemandeeEvent(r.getId(),
                    r.getNom(), r.getEmail(), c.getCandidatNom(), c.getMissionIntitule(), relance));
        }
    }

    private ReferenceCandidat reference(UUID candidatureId, UUID referenceId) {
        return references.findById(referenceId).filter(x -> x.getCandidatureId().equals(candidatureId))
                .orElseThrow(() -> new NotFoundException("Référence introuvable"));
    }

    private Candidature enCours(UUID id) {
        Candidature c = charger(id);
        if (c.getEtape().estSortie() || c.getEtape() == Etape.PLACE) {
            throw new BusinessException("Cette candidature est close");
        }
        return c;
    }

    private Candidature charger(UUID id) {
        return candidatures.findById(id).orElseThrow(() -> new NotFoundException("Candidature introuvable"));
    }

    private static String vide(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
