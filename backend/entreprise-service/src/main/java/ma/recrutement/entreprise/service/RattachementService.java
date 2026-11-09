package ma.recrutement.entreprise.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.RattachementEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.entreprise.domain.Contact;
import ma.recrutement.entreprise.domain.DemandeRattachement;
import ma.recrutement.entreprise.domain.Entreprise;
import ma.recrutement.entreprise.repository.DemandeRattachementRepository;
import ma.recrutement.entreprise.repository.EntrepriseRepository;
import ma.recrutement.entreprise.web.Dtos.EntrepriseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Suite donnée par le recruteur aux comptes entreprise inscrits en ligne. L'espace recruteur
 * renseigne d'abord l'entreprise sur le compte Keycloak (compte-service), puis appelle
 * {@link #accepter} : le compte devient un contact de l'entreprise et la demande est close.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class RattachementService {

    private final DemandeRattachementRepository demandes;
    private final EntrepriseRepository entreprises;
    private final EntrepriseService entrepriseService;
    private final EventPublisher events;

    public EntrepriseDto accepter(UUID demandeId, UUID entrepriseId) {
        DemandeRattachement d = enAttente(demandeId);
        Entreprise e = entreprises.findById(entrepriseId).orElseThrow(() -> new NotFoundException("Entreprise introuvable"));
        boolean dejaContact = e.getContacts().stream().anyMatch(c -> d.getKeycloakUserId().equals(c.getKeycloakUserId())
                || (c.getEmail() != null && c.getEmail().equalsIgnoreCase(d.getEmail())));
        if (!dejaContact) {
            Contact c = new Contact();
            c.setEntreprise(e);
            c.setNom(d.getNom());
            c.setEmail(d.getEmail());
            c.setTelephone(d.getTelephone());
            c.setKeycloakUserId(d.getKeycloakUserId());
            e.getContacts().add(c);
        } else {
            e.getContacts().stream()
                    .filter(c -> c.getEmail() != null && c.getEmail().equalsIgnoreCase(d.getEmail()) && c.getKeycloakUserId() == null)
                    .forEach(c -> c.setKeycloakUserId(d.getKeycloakUserId()));
        }
        d.setStatut(DemandeRattachement.RATTACHEE);
        d.setEntrepriseId(e.getId());
        d.setTraiteeLe(OffsetDateTime.now());
        events.publier(Topics.ENTREPRISE, Events.RATTACHEMENT_ACCEPTE, d.getId(),
                new RattachementEvent(d.getId(), d.getNom(), d.getEmail(), e.getRaisonSociale(), true));
        return entrepriseService.detail(e.getId());
    }

    public void refuser(UUID demandeId) {
        DemandeRattachement d = enAttente(demandeId);
        d.setStatut(DemandeRattachement.REFUSEE);
        d.setTraiteeLe(OffsetDateTime.now());
        events.publier(Topics.ENTREPRISE, Events.RATTACHEMENT_REFUSE, d.getId(),
                new RattachementEvent(d.getId(), d.getNom(), d.getEmail(), d.getRaisonSociale(), false));
    }

    private DemandeRattachement enAttente(UUID id) {
        DemandeRattachement d = demandes.findById(id).orElseThrow(() -> new NotFoundException("Demande introuvable"));
        if (!DemandeRattachement.EN_ATTENTE.equals(d.getStatut())) {
            throw new BusinessException("Cette demande a déjà été traitée");
        }
        return d;
    }
}
