package ma.recrutement.entreprise.messagerie;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.MessageMissionEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.entreprise.domain.Mission;
import ma.recrutement.entreprise.repository.MissionRepository;
import ma.recrutement.entreprise.service.MissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fil d'échanges entre le recruteur et l'entreprise sur une mission.
 * Les droits sont ceux de la mission : le recruteur voit tous les fils, un client ceux de ses missions.
 * E-mails regroupés : le destinataire reçoit un e-mail au premier message d'une salve, puis plus rien
 * tant que personne de son côté n'a ouvert le fil.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MessagerieService {

    public static final int LONGUEUR_MAX = 4000;
    private static final int LONGUEUR_EXTRAIT = 280;
    private static final OffsetDateTime ORIGINE = OffsetDateTime.parse("2000-01-01T00:00:00Z");

    private final MissionService missionsDroits;
    private final MissionRepository missions;
    private final MessageMissionRepository messages;
    private final LectureMessageRepository lectures;
    private final FilMissionRepository fils;
    private final EventPublisher events;

    public record MessageDto(UUID id, String auteurNom, String auteurRole, String contenu, OffsetDateTime creeLe, boolean deMoi) {
    }

    public record NonLuDto(UUID missionId, String missionIntitule, String entrepriseNom, long nonLus, OffsetDateTime dernierLe) {
    }

    /** Résumé d'un fil pour la boîte de réception. */
    public record FilDto(UUID missionId, String missionIntitule, String entrepriseNom, String missionStatut,
                         String dernierAuteur, String dernierExtrait, OffsetDateTime dernierLe, boolean dernierDeMoi, long nonLus) {
    }

    @Transactional(readOnly = true)
    public List<MessageDto> fil(UUID missionId) {
        missionsDroits.chargerAvecDroits(missionId);
        String moi = CurrentUser.id();
        return messages.findByMissionIdOrderByCreeLeAsc(missionId).stream()
                .map(m -> new MessageDto(m.getId(), m.getAuteurNom(), m.getAuteurRole(), m.getContenu(), m.getCreeLe(), moi.equals(m.getAuteurId())))
                .toList();
    }

    public MessageDto envoyer(UUID missionId, String contenu) {
        Mission mission = missionsDroits.chargerAvecDroits(missionId);
        String texte = contenu == null ? "" : contenu.strip();
        if (texte.isEmpty()) {
            throw new BusinessException("Le message est vide");
        }
        if (texte.length() > LONGUEUR_MAX) {
            throw new BusinessException("Le message dépasse " + LONGUEUR_MAX + " caractères");
        }
        boolean recruteur = CurrentUser.hasRole(Roles.RECRUTEUR);

        MessageMission m = new MessageMission();
        m.setMissionId(missionId);
        m.setEntrepriseId(mission.getEntreprise().getId());
        m.setAuteurId(CurrentUser.id());
        m.setAuteurNom(nomAuteur(recruteur));
        m.setAuteurRole(recruteur ? MessageMission.RECRUTEUR : MessageMission.ENTREPRISE);
        m.setContenu(texte);
        messages.save(m);

        // L'auteur a forcément lu le fil jusqu'ici ; son côté n'attend plus rien.
        noterLecture(missionId, m.getCreeLe());
        FilMission fil = fils.findById(missionId).orElseGet(() -> new FilMission(missionId));
        boolean dejaPrevenu = recruteur ? fil.isAttenteEntreprise() : fil.isAttenteRecruteur();
        if (recruteur) {
            fil.setAttenteRecruteur(false);
            fil.setAttenteEntreprise(true);
        } else {
            fil.setAttenteEntreprise(false);
            fil.setAttenteRecruteur(true);
        }
        fils.save(fil);

        if (!dejaPrevenu) {
            events.publier(Topics.ENTREPRISE, Events.MESSAGE_MISSION, missionId, new MessageMissionEvent(
                    missionId, mission.getIntitule(), mission.getEntreprise().getRaisonSociale(), m.getAuteurNom(),
                    !recruteur, extrait(texte), mission.getEntreprise().contactPrincipalEmail()));
        }
        return new MessageDto(m.getId(), m.getAuteurNom(), m.getAuteurRole(), m.getContenu(), m.getCreeLe(), true);
    }

    /** L'utilisateur a ouvert le fil : ses messages non lus disparaissent et son côté pourra de nouveau être prévenu. */
    public void marquerLu(UUID missionId) {
        missionsDroits.chargerAvecDroits(missionId);
        noterLecture(missionId, OffsetDateTime.now());
        fils.findById(missionId).ifPresent(fil -> {
            if (CurrentUser.hasRole(Roles.RECRUTEUR)) {
                fil.setAttenteRecruteur(false);
            } else {
                fil.setAttenteEntreprise(false);
            }
        });
    }

    /** Fils qui contiennent des messages non lus par l'utilisateur, du plus récent au plus ancien. */
    @Transactional(readOnly = true)
    public List<NonLuDto> nonLus() {
        String moi = CurrentUser.id();
        List<Object[]> lignes = CurrentUser.hasRole(Roles.RECRUTEUR)
                ? messages.nonLus(moi, ORIGINE)
                : messages.nonLusEntreprise(CurrentUser.entrepriseId(), moi, ORIGINE);
        if (lignes.isEmpty()) {
            return List.of();
        }
        Map<UUID, Mission> parId = missions.findAllById(lignes.stream().map(l -> (UUID) l[0]).toList()).stream()
                .collect(Collectors.toMap(Mission::getId, Function.identity()));
        return lignes.stream()
                .filter(l -> parId.containsKey((UUID) l[0]))
                .map(l -> {
                    Mission mission = parId.get((UUID) l[0]);
                    return new NonLuDto(mission.getId(), mission.getIntitule(), mission.getEntreprise().getRaisonSociale(),
                            ((Number) l[1]).longValue(), (OffsetDateTime) l[2]);
                })
                .sorted(Comparator.comparing(NonLuDto::dernierLe).reversed())
                .toList();
    }

    /** Tous les fils visibles, du plus récent au plus ancien, avec le dernier message et le nombre de non-lus. */
    @Transactional(readOnly = true)
    public List<FilDto> fils() {
        String moi = CurrentUser.id();
        boolean recruteur = CurrentUser.hasRole(Roles.RECRUTEUR);
        List<MessageMission> derniers = recruteur ? messages.derniersMessages()
                : messages.derniersMessagesEntreprise(CurrentUser.entrepriseId());
        if (derniers.isEmpty()) {
            return List.of();
        }
        Map<UUID, Long> nonLus = (recruteur ? messages.nonLus(moi, ORIGINE)
                : messages.nonLusEntreprise(CurrentUser.entrepriseId(), moi, ORIGINE)).stream()
                .collect(Collectors.toMap(l -> (UUID) l[0], l -> ((Number) l[1]).longValue()));
        Map<UUID, Mission> parId = missions.findAllById(derniers.stream().map(MessageMission::getMissionId).toList()).stream()
                .collect(Collectors.toMap(Mission::getId, Function.identity()));
        java.util.Set<UUID> vus = new java.util.HashSet<>();
        return derniers.stream()
                .filter(m -> parId.containsKey(m.getMissionId()) && vus.add(m.getMissionId()))
                .map(m -> {
                    Mission mission = parId.get(m.getMissionId());
                    return new FilDto(mission.getId(), mission.getIntitule(), mission.getEntreprise().getRaisonSociale(),
                            mission.getStatut().name(), m.getAuteurNom(), extrait(m.getContenu()), m.getCreeLe(),
                            moi.equals(m.getAuteurId()), nonLus.getOrDefault(mission.getId(), 0L));
                })
                .toList();
    }

    private void noterLecture(UUID missionId, OffsetDateTime quand) {
        String moi = CurrentUser.id();
        LectureMessage l = lectures.findByMissionIdAndUtilisateurId(missionId, moi).orElseGet(() -> {
            LectureMessage nouvelle = new LectureMessage();
            nouvelle.setMissionId(missionId);
            nouvelle.setUtilisateurId(moi);
            return nouvelle;
        });
        if (l.getLuLe() == null || quand.isAfter(l.getLuLe())) {
            l.setLuLe(quand);
        }
        lectures.save(l);
    }

    private static String nomAuteur(boolean recruteur) {
        String nom = CurrentUser.nom();
        if (nom == null || nom.isBlank()) {
            nom = recruteur ? "Votre recruteur" : CurrentUser.email();
        }
        return nom == null ? "Utilisateur" : nom;
    }

    private static String extrait(String texte) {
        String une = texte.replaceAll("\\s+", " ");
        return une.length() <= LONGUEUR_EXTRAIT ? une : une.substring(0, LONGUEUR_EXTRAIT - 1).stripTrailing() + "…";
    }
}
