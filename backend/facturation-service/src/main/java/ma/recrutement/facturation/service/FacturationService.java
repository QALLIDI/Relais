package ma.recrutement.facturation.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.events.CandidatPlaceEvent;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.FactureEmiseEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.security.CurrentUser;
import ma.recrutement.common.security.Roles;
import ma.recrutement.common.web.BusinessException;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.facturation.domain.Facture;
import ma.recrutement.facturation.domain.Placement;
import ma.recrutement.facturation.domain.StatutFacture;
import ma.recrutement.facturation.repository.FactureRepository;
import ma.recrutement.facturation.repository.PlacementRepository;
import ma.recrutement.facturation.web.Dtos.*;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class FacturationService {

    private final PlacementRepository placements;
    private final FactureRepository factures;
    private final EventPublisher events;
    private final EvenementsRecus recus;

    @Value("${app.facturation.garantie-mois:3}")
    private int garantieMois;

    @Value("${app.facturation.delai-paiement-jours:30}")
    private int delaiPaiementJours;

    @KafkaListener(topics = Topics.SELECTION)
    public void recevoir(ConsumerRecord<String, String> message) {
        switch (recus.type(message)) {
            case Events.CANDIDAT_PLACE -> recus.traiter(message, CandidatPlaceEvent.class, this::surPlacement);
            default -> {
                // Les autres événements de la sélection ne concernent pas la facturation.
            }
        }
    }

    /** Un placement crée automatiquement une facture brouillon des honoraires. Traitement idempotent. */
    void surPlacement(CandidatPlaceEvent e) {
        if (placements.existsByCandidatureId(e.candidatureId())) {
            log.info("Placement déjà enregistré pour la candidature {}", e.candidatureId());
            return;
        }
        Placement p = new Placement();
        p.setCandidatureId(e.candidatureId());
        p.setMissionId(e.missionId());
        p.setEntrepriseId(e.entrepriseId());
        p.setEntrepriseNom(e.entrepriseNom());
        p.setMissionIntitule(e.missionIntitule());
        p.setCandidatId(e.candidatId());
        p.setCandidatNom(e.candidatNom());
        p.setSalaireAnnuel(e.salaireAnnuel());
        p.setTauxHonoraires(e.tauxHonoraires() == null ? Honoraires.TAUX_PAR_DEFAUT : e.tauxHonoraires());
        p.setDateEmbauche(e.dateEmbauche());
        p.setFinGarantie(e.dateEmbauche().plusMonths(garantieMois));
        p.setContactEmail(e.contactEmail());
        placements.save(p);

        Facture f = new Facture();
        f.setEntrepriseId(e.entrepriseId());
        f.setEntrepriseNom(e.entrepriseNom());
        f.setContactEmail(e.contactEmail());
        f.setPlacementId(p.getId());
        f.setObjet("Placement · " + e.missionIntitule() + " · " + e.candidatNom());
        appliquerMontants(f, Honoraires.honorairesHt(e.salaireAnnuel(), p.getTauxHonoraires()));
        factures.save(f);
        log.info("Facture brouillon créée pour le placement de {} chez {}", e.candidatNom(), e.entrepriseNom());
    }

    @Transactional(readOnly = true)
    public List<FactureDto> lister() {
        List<Facture> liste = CurrentUser.hasRole(Roles.RECRUTEUR) ? factures.findAllByOrderByCreatedAtDesc()
                : factures.findByEntrepriseIdAndStatutNotOrderByDateEmissionDesc(CurrentUser.entrepriseId(), StatutFacture.BROUILLON);
        return liste.stream().map(FactureDto::of).toList();
    }

    public FactureDto creer(FactureRequest req) {
        Facture f = new Facture();
        f.setEntrepriseId(req.entrepriseId());
        f.setEntrepriseNom(req.entrepriseNom());
        f.setContactEmail(req.contactEmail());
        f.setObjet(req.objet());
        appliquerMontants(f, req.montantHt());
        return FactureDto.of(factures.save(f));
    }

    public FactureDto emettre(UUID id) {
        Facture f = charger(id);
        if (f.getStatut() != StatutFacture.BROUILLON) {
            throw new BusinessException("Seul un brouillon peut être émis");
        }
        LocalDate aujourdhui = LocalDate.now();
        f.setNumero("F-%d-%03d".formatted(aujourdhui.getYear(), factures.prochainNumero()));
        f.setStatut(StatutFacture.EMISE);
        f.setDateEmission(aujourdhui);
        f.setEcheance(aujourdhui.plusDays(delaiPaiementJours));
        events.publier(Topics.FACTURATION, Events.FACTURE_EMISE, f.getId(), new FactureEmiseEvent(f.getId(), f.getNumero(),
                f.getEntrepriseId(), f.getEntrepriseNom(), f.getMontantTtc(), f.getEcheance(), f.getContactEmail()));
        return FactureDto.of(f);
    }

    public FactureDto marquerPayee(UUID id) {
        Facture f = charger(id);
        if (f.getStatut() != StatutFacture.EMISE) {
            throw new BusinessException("Seule une facture émise peut être marquée payée");
        }
        f.setStatut(StatutFacture.PAYEE);
        f.setDatePaiement(LocalDate.now());
        return FactureDto.of(f);
    }

    @Transactional(readOnly = true)
    public Facture pourPdf(UUID id) {
        Facture f = charger(id);
        if (!CurrentUser.hasRole(Roles.RECRUTEUR)
                && (!f.getEntrepriseId().equals(CurrentUser.entrepriseId()) || f.getStatut() == StatutFacture.BROUILLON)) {
            throw new AccessDeniedException("Cette facture ne vous est pas adressée");
        }
        return f;
    }

    @Transactional(readOnly = true)
    public List<PlacementDto> placements() {
        return placements.findAllByOrderByCreatedAtDesc().stream().map(PlacementDto::of).toList();
    }

    @Transactional(readOnly = true)
    public FacturationStats stats() {
        List<Facture> toutes = factures.findAll();
        YearMonth ceMois = YearMonth.now();
        BigDecimal factureCeMois = somme(toutes, f -> f.getDateEmission() != null && YearMonth.from(f.getDateEmission()).equals(ceMois));
        BigDecimal encaisseCeMois = somme(toutes, f -> f.getDatePaiement() != null && YearMonth.from(f.getDatePaiement()).equals(ceMois));
        BigDecimal enAttente = somme(toutes, f -> f.getStatut() == StatutFacture.EMISE && !f.enRetard());
        BigDecimal enRetard = somme(toutes, Facture::enRetard);

        List<MoisMontant> parMois = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth mois = ceMois.minusMonths(i);
            BigDecimal montant = somme(toutes, f -> f.getDatePaiement() != null && YearMonth.from(f.getDatePaiement()).equals(mois));
            parMois.add(new MoisMontant(mois.getMonth().getDisplayName(TextStyle.SHORT, Locale.FRENCH), montant));
        }

        Map<String, List<Placement>> parEntreprise = placements.findAll().stream()
                .collect(Collectors.groupingBy(Placement::getEntrepriseNom));
        List<ClientMontant> parClient = parEntreprise.entrySet().stream()
                .map(e -> new ClientMontant(e.getKey(), e.getValue().size(),
                        somme(toutes, f -> f.getStatut() != StatutFacture.BROUILLON && e.getKey().equals(f.getEntrepriseNom()))))
                .sorted(Comparator.comparing(ClientMontant::montantHt).reversed())
                .toList();

        return new FacturationStats(factureCeMois, encaisseCeMois, enAttente, enRetard, placements.count(), parMois, parClient);
    }

    private static BigDecimal somme(List<Facture> liste, Predicate<Facture> filtre) {
        return liste.stream().filter(filtre).map(Facture::getMontantHt).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static void appliquerMontants(Facture f, BigDecimal ht) {
        Honoraires.Montants m = Honoraires.avecTva(ht);
        f.setMontantHt(m.ht());
        f.setTauxTva(Honoraires.TVA);
        f.setMontantTva(m.tva());
        f.setMontantTtc(m.ttc());
    }

    private Facture charger(UUID id) {
        return factures.findById(id).orElseThrow(() -> new NotFoundException("Facture introuvable"));
    }
}
