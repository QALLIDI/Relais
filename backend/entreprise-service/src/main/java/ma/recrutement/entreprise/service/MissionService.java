package ma.recrutement.entreprise.service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.events.MissionAnnuleeEvent;
import ma.recrutement.common.events.MissionOuverteEvent;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.entreprise.domain.Entreprise;
import ma.recrutement.entreprise.domain.Mission;
import ma.recrutement.entreprise.domain.StatutMission;
import ma.recrutement.entreprise.repository.EntrepriseRepository;
import ma.recrutement.entreprise.repository.MissionRepository;
import ma.recrutement.entreprise.web.Dtos.CompetenceCount;
import ma.recrutement.entreprise.web.Dtos.MissionDto;
import ma.recrutement.entreprise.web.Dtos.MissionRequest;
import ma.recrutement.entreprise.web.Dtos.MissionStats;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MissionService {

    private final MissionRepository missions;
    private final EntrepriseRepository entreprises;
    private final EventPublisher events;

    @Transactional(readOnly = true)
    public List<MissionDto> lister(StatutMission statut) {
        List<Mission> result;
        if (CurrentUser.hasRole(Roles.RECRUTEUR)) {
            result = statut == null ? missions.findAllByOrderByCreatedAtDesc()
                    : missions.findByStatutOrderByCreatedAtDesc(statut);
        } else {
            result = missions.findByEntrepriseIdOrderByCreatedAtDesc(CurrentUser.entrepriseId()).stream()
                    .filter(m -> statut == null || m.getStatut() == statut)
                    .toList();
        }
        return result.stream().map(MissionDto::of).toList();
    }

    @Transactional(readOnly = true)
    public MissionDto detail(UUID id) {
        return MissionDto.of(chargerAvecDroits(id));
    }

    /**
     * Le recruteur crée une mission pour n'importe quel client ; un client crée un besoin
     * pour sa propre entreprise, toujours en attente de validation.
     */
    public MissionDto creer(MissionRequest req) {
        Mission m = new Mission();
        if (CurrentUser.hasRole(Roles.RECRUTEUR)) {
            if (req.entrepriseId() == null) {
                throw new IllegalArgumentException("entrepriseId est obligatoire");
            }
            m.setEntreprise(entreprise(req.entrepriseId()));
            m.setStatut(req.statut() == null ? StatutMission.OUVERTE : req.statut());
        } else {
            exigerAdministrateur();
            m.setEntreprise(entreprise(CurrentUser.entrepriseId()));
            m.setStatut(StatutMission.EN_VALIDATION);
        }
        appliquer(m, req);
        missions.save(m);
        notifierSiOuverte(m);
        return MissionDto.of(m);
    }

    public MissionDto modifier(UUID id, MissionRequest req) {
        Mission m = chargerAvecDroits(id);
        exigerAdministrateur();
        if (!CurrentUser.hasRole(Roles.RECRUTEUR) && m.getStatut() != StatutMission.EN_VALIDATION) {
            throw new AccessDeniedException("Ce besoin a déjà été validé ; contactez votre recruteur");
        }
        appliquer(m, req);
        return MissionDto.of(m);
    }

    public MissionDto changerStatut(UUID id, StatutMission statut, String motif) {
        Mission m = chargerAvecDroits(id);
        boolean annulation = statut == StatutMission.ANNULEE && m.getStatut() != StatutMission.ANNULEE;
        m.setStatut(statut);
        notifierSiOuverte(m);
        if (annulation) {
            m.setMotifAnnulation(motif == null || motif.isBlank() ? null : motif.strip());
            Entreprise e = m.getEntreprise();
            events.publier(Topics.ENTREPRISE, Events.MISSION_ANNULEE, m.getId(), new MissionAnnuleeEvent(
                    m.getId(), e.getId(), e.getRaisonSociale(), m.getIntitule(), m.getMotifAnnulation(),
                    e.contactPrincipalEmail()));
        }
        return MissionDto.of(m);
    }

    @Transactional(readOnly = true)
    public MissionStats stats() {
        Map<StatutMission, Long> parStatut = new EnumMap<>(StatutMission.class);
        for (StatutMission s : StatutMission.values()) {
            parStatut.put(s, missions.countByStatut(s));
        }
        List<CompetenceCount> competences = missions.competencesLesPlusDemandees().stream()
                .limit(10)
                .map(row -> new CompetenceCount((String) row[0], (Long) row[1]))
                .toList();
        return new MissionStats(parStatut, competences, entreprises.count());
    }

    private void notifierSiOuverte(Mission m) {
        if (m.getStatut() == StatutMission.OUVERTE && !m.isOuvertureNotifiee()) {
            m.setOuvertureNotifiee(true);
            Entreprise e = m.getEntreprise();
            events.publier(Topics.ENTREPRISE, Events.MISSION_OUVERTE, m.getId(), new MissionOuverteEvent(
                    m.getId(), e.getId(), e.getRaisonSociale(), m.getIntitule(), m.getVille(),
                    List.copyOf(m.getCompetencesRequises()), e.contactPrincipalEmail()));
        }
    }

    private void appliquer(Mission m, MissionRequest req) {
        m.setIntitule(req.intitule());
        m.setDescription(req.description());
        m.setTypeContrat(req.typeContrat());
        m.setVille(req.ville());
        m.setTeletravail(req.teletravail());
        m.setNbPostes(req.nbPostes() == null ? 1 : req.nbPostes());
        m.setExperienceMin(req.experienceMin());
        m.setSalaireMin(req.salaireMin());
        m.setSalaireMax(req.salaireMax());
        m.setDateLimite(req.dateLimite());
        m.setPriorite(req.priorite());
        if (req.confidentiel() != null) {
            m.setConfidentiel(req.confidentiel());
        }
        m.setCompetencesRequises(new ArrayList<>(req.competencesRequises() == null ? List.of() : req.competencesRequises()));
        m.setCompetencesSouhaitees(new ArrayList<>(req.competencesSouhaitees() == null ? List.of() : req.competencesSouhaitees()));
    }

    /** Côté client, publier ou modifier un besoin engage l'entreprise : réservé à ses administrateurs. */
    private static void exigerAdministrateur() {
        if (!CurrentUser.hasRole(Roles.RECRUTEUR) && !CurrentUser.hasRole(Roles.ENTREPRISE_ADMIN)) {
            throw new AccessDeniedException("Réservé aux administrateurs de votre entreprise");
        }
    }

    /** Mission visible par l'utilisateur courant : toutes pour le recruteur, les siennes pour une entreprise. */
    @Transactional(readOnly = true)
    public Mission chargerAvecDroits(UUID id) {
        Mission m = missions.findById(id).orElseThrow(() -> new NotFoundException("Mission introuvable"));
        if (!CurrentUser.hasRole(Roles.RECRUTEUR) && !m.getEntreprise().getId().equals(CurrentUser.entrepriseId())) {
            throw new AccessDeniedException("Cette mission appartient à une autre entreprise");
        }
        return m;
    }

    private Entreprise entreprise(UUID id) {
        return entreprises.findById(id).orElseThrow(() -> new NotFoundException("Entreprise introuvable"));
    }
}
