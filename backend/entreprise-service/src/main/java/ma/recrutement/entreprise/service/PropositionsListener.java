package ma.recrutement.entreprise.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.PropositionEvent;
import ma.recrutement.common.events.Topics;
import ma.recrutement.entreprise.domain.ModeleTarif;
import ma.recrutement.entreprise.repository.EntrepriseRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Proposition commerciale acceptée par le client : sa formule devient le contrat de l'entreprise. */
@Component
@RequiredArgsConstructor
@Slf4j
public class PropositionsListener {

    private final EvenementsRecus recus;
    private final EntrepriseRepository entreprises;

    @KafkaListener(topics = Topics.FACTURATION)
    @Transactional
    public void recevoir(ConsumerRecord<String, String> message) {
        if (Events.PROPOSITION_ACCEPTEE.equals(recus.type(message))) {
            recus.traiter(message, PropositionEvent.class, this::acceptee);
        }
    }

    void acceptee(PropositionEvent e) {
        entreprises.findById(e.entrepriseId()).ifPresentOrElse(ent -> {
            switch (e.formule()) {
                case "SUCCES" -> {
                    ent.setModeleTarif(e.acomptePct() > 0 ? ModeleTarif.ACOMPTE_ET_SOLDE : ModeleTarif.POURCENTAGE);
                    ent.setTauxHonoraires(e.taux());
                }
                case "FORFAIT" -> ent.setModeleTarif(ModeleTarif.FORFAIT);
                case "ABONNEMENT" -> ent.setModeleTarif(ModeleTarif.ABONNEMENT);
                default -> log.warn("Formule inconnue dans la proposition {} : {}", e.propositionId(), e.formule());
            }
            log.info("Contrat de {} mis à jour : formule {}", ent.getRaisonSociale(), e.formule());
        }, () -> log.warn("Proposition acceptée pour une entreprise inconnue : {}", e.entrepriseId()));
    }
}
