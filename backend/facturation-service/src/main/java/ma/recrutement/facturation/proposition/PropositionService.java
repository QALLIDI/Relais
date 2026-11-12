package ma.recrutement.facturation.proposition;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.PropositionEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Propositions commerciales : le recruteur les envoie, le client les accepte ou les refuse depuis son
 * espace. Une proposition acceptée met à jour le contrat de l'entreprise (entreprise-service).
 */
@Service
@Transactional
@RequiredArgsConstructor
public class PropositionService {

    private static final Set<String> FORMULES = Set.of("SUCCES", "FORFAIT", "ABONNEMENT");

    private final PropositionRepository propositions;
    private final EventPublisher events;

    public record PropositionDto(UUID id, UUID entrepriseId, String entrepriseNom, String contactEmail, String poste,
                                 String formule, BigDecimal taux, BigDecimal montant, int acomptePct, int garantieMois,
                                 String statut, String motifRefus, OffsetDateTime envoyeeLe, OffsetDateTime reponduLe) {
        static PropositionDto of(Proposition p) {
            return new PropositionDto(p.getId(), p.getEntrepriseId(), p.getEntrepriseNom(), p.getContactEmail(), p.getPoste(),
                    p.getFormule(), p.getTaux(), p.getMontant(), p.getAcomptePct(), p.getGarantieMois(), p.getStatut(),
                    p.getMotifRefus(), p.getEnvoyeeLe(), p.getReponduLe());
        }
    }

    public record Demande(UUID entrepriseId, String entrepriseNom, String contactEmail, String poste, String formule,
                          BigDecimal taux, BigDecimal montant, int acomptePct, int garantieMois) {
    }

    @Transactional(readOnly = true)
    public List<PropositionDto> lister() {
        List<Proposition> liste = CurrentUser.hasRole(Roles.RECRUTEUR) ? propositions.findAllByOrderByEnvoyeeLeDesc()
                : propositions.findByEntrepriseIdOrderByEnvoyeeLeDesc(CurrentUser.entrepriseId());
        return liste.stream().map(PropositionDto::of).toList();
    }

    public PropositionDto envoyer(Demande d) {
        if (!FORMULES.contains(d.formule())) {
            throw new BusinessException("Formule inconnue : " + d.formule());
        }
        if ("SUCCES".equals(d.formule()) ? d.taux() == null || d.taux().signum() <= 0 : d.montant() == null || d.montant().signum() <= 0) {
            throw new BusinessException("SUCCES".equals(d.formule()) ? "Indiquez le taux d'honoraires" : "Indiquez le montant");
        }
        Proposition p = new Proposition();
        p.setEntrepriseId(d.entrepriseId());
        p.setEntrepriseNom(d.entrepriseNom());
        p.setContactEmail(d.contactEmail());
        p.setPoste(d.poste());
        p.setFormule(d.formule());
        p.setTaux("SUCCES".equals(d.formule()) ? d.taux() : null);
        p.setMontant("SUCCES".equals(d.formule()) ? null : d.montant());
        p.setAcomptePct(Math.max(0, Math.min(100, d.acomptePct())));
        p.setGarantieMois(Math.max(0, Math.min(12, d.garantieMois())));
        propositions.save(p);
        publier(Events.PROPOSITION_ENVOYEE, p);
        return PropositionDto.of(p);
    }

    public PropositionDto accepter(UUID id) {
        Proposition p = aRepondre(id);
        p.setStatut(Proposition.ACCEPTEE);
        p.setReponduLe(OffsetDateTime.now());
        publier(Events.PROPOSITION_ACCEPTEE, p);
        return PropositionDto.of(p);
    }

    public PropositionDto refuser(UUID id, String motif) {
        Proposition p = aRepondre(id);
        p.setStatut(Proposition.REFUSEE);
        p.setMotifRefus(motif == null || motif.isBlank() ? null : motif.strip());
        p.setReponduLe(OffsetDateTime.now());
        publier(Events.PROPOSITION_REFUSEE, p);
        return PropositionDto.of(p);
    }

    /** Le client ne répond qu'aux propositions de son entreprise, et une seule fois. */
    private Proposition aRepondre(UUID id) {
        Proposition p = propositions.findById(id).orElseThrow(() -> new NotFoundException("Proposition introuvable"));
        if (!p.getEntrepriseId().equals(CurrentUser.entrepriseId())) {
            throw new AccessDeniedException("Cette proposition concerne une autre entreprise");
        }
        if (!Proposition.ENVOYEE.equals(p.getStatut())) {
            throw new BusinessException("Vous avez déjà répondu à cette proposition");
        }
        return p;
    }

    private void publier(String type, Proposition p) {
        events.publier(Topics.FACTURATION, type, p.getId(), new PropositionEvent(p.getId(), p.getEntrepriseId(), p.getEntrepriseNom(),
                p.getContactEmail(), p.getPoste(), p.getFormule(), p.getTaux(), p.getMontant(), p.getAcomptePct(),
                p.getGarantieMois(), p.getMotifRefus()));
    }
}
