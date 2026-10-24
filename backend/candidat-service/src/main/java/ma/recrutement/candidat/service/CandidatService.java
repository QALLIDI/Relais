package ma.recrutement.candidat.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import ma.recrutement.candidat.domain.Candidat;
import ma.recrutement.candidat.domain.Disponibilite;
import ma.recrutement.candidat.domain.Niveau;
import ma.recrutement.candidat.domain.Note;
import ma.recrutement.candidat.repository.CandidatRepository;
import ma.recrutement.candidat.repository.CandidatSpecifications;
import ma.recrutement.candidat.repository.NoteRepository;
import ma.recrutement.candidat.web.Dtos.CandidatDto;
import ma.recrutement.candidat.web.Dtos.CandidatRequest;
import ma.recrutement.candidat.web.Dtos.CandidatResume;
import ma.recrutement.candidat.web.Dtos.ExperienceDto;
import ma.recrutement.candidat.web.Dtos.Groupe;
import ma.recrutement.candidat.web.Dtos.NoteDto;
import ma.recrutement.candidat.web.Dtos.VivierStats;
import ma.recrutement.common.events.CandidatEvent;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.NotFoundException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class CandidatService {

    private final CandidatRepository candidats;
    private final NoteRepository notes;
    private final CvStorage cvStorage;
    private final RabbitTemplate rabbit;

    @Transactional(readOnly = true)
    public List<CandidatResume> rechercher(String q, String ville, Niveau niveau, Disponibilite dispo,
                                           String competence, String secteur) {
        return candidats.findAll(CandidatSpecifications.recherche(q, ville, niveau, dispo, competence, secteur))
                .stream()
                .sorted(Comparator.comparing(Candidat::getUpdatedAt).reversed())
                .map(c -> CandidatResume.of(c, true))
                .toList();
    }

    /**
     * Regroupe le vivier par niveau, secteur, technologie, ville ou disponibilité.
     * Par technologie, un candidat apparaît dans chacune de ses compétences.
     */
    @Transactional(readOnly = true)
    public List<Groupe> regrouper(String par) {
        List<Candidat> actifs = candidats.findByAnonymiseFalse();
        Function<Candidat, Collection<String>> cles = switch (par == null ? "niveau" : par) {
            case "secteur" -> c -> List.of(valeur(c.getSecteur()));
            case "techno" -> c -> c.getCompetences().isEmpty() ? List.of("Non renseignée") : c.getCompetences();
            case "ville" -> c -> List.of(valeur(c.getVille()));
            case "disponibilite" -> c -> List.of(c.getDisponibilite() == null ? "Non renseignée" : c.getDisponibilite().libelle());
            default -> c -> List.of(c.getNiveau() == null ? "Non renseigné" : c.getNiveau().libelle());
        };
        Map<String, List<Candidat>> groupes = new LinkedHashMap<>();
        for (Candidat c : actifs) {
            for (String cle : cles.apply(c)) {
                groupes.computeIfAbsent(cle, k -> new ArrayList<>()).add(c);
            }
        }
        return groupes.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, List<Candidat>> e) -> e.getValue().size()).reversed())
                .map(e -> new Groupe(e.getKey(), e.getKey(), e.getValue().size(),
                        e.getValue().stream().map(c -> CandidatResume.of(c, false)).toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CandidatResume> resumes(List<UUID> ids) {
        boolean recruteur = CurrentUser.hasRole(Roles.RECRUTEUR);
        return candidats.findAllById(ids).stream().map(c -> CandidatResume.of(c, recruteur)).toList();
    }

    @Transactional(readOnly = true)
    public CandidatDto detail(UUID id) {
        return CandidatDto.of(charger(id));
    }

    public CandidatDto creer(CandidatRequest req) {
        Candidat c = new Candidat();
        appliquer(c, req);
        candidats.save(c);
        publier(Events.CANDIDAT_CREE, c);
        return CandidatDto.of(c);
    }

    public CandidatDto modifier(UUID id, CandidatRequest req) {
        Candidat c = charger(id);
        appliquer(c, req);
        publier(Events.CANDIDAT_MODIFIE, c);
        return CandidatDto.of(c);
    }

    /** Profil du candidat connecté : retrouvé par son compte Keycloak, ou par e-mail s'il a été sourcé avant. */
    @Transactional(readOnly = true)
    public CandidatDto monProfil() {
        return CandidatDto.of(monCandidat());
    }

    public CandidatDto enregistrerMonProfil(CandidatRequest req) {
        Candidat c = candidats.findByKeycloakUserId(CurrentUser.id())
                .or(() -> CurrentUser.email() == null ? java.util.Optional.empty()
                        : candidats.findFirstByEmailIgnoreCase(CurrentUser.email()))
                .orElseGet(Candidat::new);
        boolean nouveau = c.getId() == null;
        c.setKeycloakUserId(CurrentUser.id());
        appliquer(c, req);
        if (c.getEmail() == null) {
            c.setEmail(CurrentUser.email());
        }
        if (c.getSource() == null) {
            c.setSource("Inscription en ligne");
        }
        candidats.save(c);
        publier(nouveau ? Events.CANDIDAT_CREE : Events.CANDIDAT_MODIFIE, c);
        return CandidatDto.of(c);
    }

    /** Droit à l'effacement : le profil est anonymisé et le CV supprimé. */
    public void supprimerMonProfil() {
        Candidat c = monCandidat();
        if (c.getCvObjectKey() != null) {
            cvStorage.supprimer(c.getCvObjectKey());
        }
        c.setNomComplet("Candidat anonymisé");
        c.setEmail(null);
        c.setTelephone(null);
        c.setKeycloakUserId(null);
        c.setCvObjectKey(null);
        c.setCvNomFichier(null);
        c.getExperiences().clear();
        c.setAnonymise(true);
        notes.deleteAll(notes.findByCandidatIdOrderByCreatedAtDesc(c.getId()));
    }

    public CandidatDto deposerCv(UUID id, MultipartFile fichier) {
        Candidat c = id == null ? monCandidat() : charger(id);
        if (c.getCvObjectKey() != null) {
            cvStorage.supprimer(c.getCvObjectKey());
        }
        c.setCvObjectKey(cvStorage.enregistrer(c.getId(), fichier));
        c.setCvNomFichier(fichier.getOriginalFilename());
        return CandidatDto.of(c);
    }

    @Transactional(readOnly = true)
    public Candidat pourTelechargement(UUID id) {
        Candidat c = id == null ? monCandidat() : charger(id);
        if (c.getCvObjectKey() == null) {
            throw new NotFoundException("Aucun CV pour ce candidat");
        }
        return c;
    }

    public java.io.InputStream lireCv(Candidat c) {
        return cvStorage.lire(c.getCvObjectKey());
    }

    public NoteDto ajouterNote(UUID candidatId, String texte) {
        charger(candidatId);
        Note n = new Note();
        n.setCandidatId(candidatId);
        n.setAuteur(CurrentUser.nom());
        n.setTexte(texte);
        return NoteDto.of(notes.save(n));
    }

    @Transactional(readOnly = true)
    public List<NoteDto> notes(UUID candidatId) {
        return notes.findByCandidatIdOrderByCreatedAtDesc(candidatId).stream().map(NoteDto::of).toList();
    }

    @Transactional(readOnly = true)
    public VivierStats stats() {
        List<Candidat> actifs = candidats.findByAnonymiseFalse();
        Map<String, Long> parSource = new LinkedHashMap<>();
        for (Object[] row : candidats.compterParSource()) {
            parSource.put((String) row[0], (Long) row[1]);
        }
        Map<String, Long> parNiveau = actifs.stream().collect(Collectors.groupingBy(
                c -> c.getNiveau() == null ? "Non renseigné" : c.getNiveau().libelle(), LinkedHashMap::new, Collectors.counting()));
        Map<String, Long> parDispo = actifs.stream().collect(Collectors.groupingBy(
                c -> c.getDisponibilite() == null ? "Non renseignée" : c.getDisponibilite().libelle(), LinkedHashMap::new, Collectors.counting()));
        OffsetDateTime debutMois = OffsetDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        return new VivierStats(actifs.size(), candidats.countByCreatedAtAfterAndAnonymiseFalse(debutMois),
                parSource, parNiveau, parDispo);
    }

    private Candidat monCandidat() {
        return candidats.findByKeycloakUserId(CurrentUser.id())
                .or(() -> CurrentUser.email() == null ? java.util.Optional.empty()
                        : candidats.findFirstByEmailIgnoreCase(CurrentUser.email()))
                .orElseThrow(() -> new NotFoundException("Profil candidat pas encore créé"));
    }

    private Candidat charger(UUID id) {
        return candidats.findById(id).orElseThrow(() -> new NotFoundException("Candidat introuvable"));
    }

    private void appliquer(Candidat c, CandidatRequest req) {
        c.setNomComplet(req.nomComplet());
        if (req.email() != null) {
            c.setEmail(req.email());
        }
        c.setTelephone(req.telephone());
        c.setTitre(req.titre());
        c.setAnneesExperience(req.anneesExperience());
        c.setSecteur(req.secteur());
        c.setVille(req.ville());
        c.setMobilite(req.mobilite());
        c.setDisponibilite(req.disponibilite() == null ? Disponibilite.UN_MOIS : req.disponibilite());
        c.setPretentionSalaire(req.pretentionSalaire());
        c.setLangues(req.langues());
        if (req.source() != null) {
            c.setSource(req.source());
        }
        c.setCompetences(new ArrayList<>(req.competences() == null ? List.of() : req.competences()));
        c.setExperiences(new ArrayList<>(req.experiences() == null ? List.of()
                : req.experiences().stream().map(ExperienceDto::toEntityPublic).toList()));
        if (Boolean.TRUE.equals(req.consentement()) && c.getConsentementLe() == null) {
            c.setConsentementLe(LocalDate.now());
        }
        c.setNiveau(Niveau.depuisExperience(req.anneesExperience()));
    }

    private void publier(String routingKey, Candidat c) {
        rabbit.convertAndSend(Events.EXCHANGE, routingKey, new CandidatEvent(c.getId(), c.getNomComplet(),
                c.getTitre(), c.getAnneesExperience(), c.getVille(), List.copyOf(c.getCompetences())));
    }

    private static String valeur(String s) {
        return s == null || s.isBlank() ? "Non renseigné" : s;
    }
}
