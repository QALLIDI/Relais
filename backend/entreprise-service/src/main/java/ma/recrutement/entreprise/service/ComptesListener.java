package ma.recrutement.entreprise.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.common.events.CompteCreeEvent;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.security.Roles;
import ma.recrutement.entreprise.domain.DemandeRattachement;
import ma.recrutement.entreprise.repository.DemandeRattachementRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Compte entreprise créé par l'inscription : il reste sans accès jusqu'à son rattachement par le recruteur. */
@Component
@RequiredArgsConstructor
@Slf4j
public class ComptesListener {

    private final EvenementsRecus recus;
    private final DemandeRattachementRepository demandes;

    @KafkaListener(topics = Topics.COMPTE)
    @Transactional
    public void recevoir(ConsumerRecord<String, String> message) {
        if (Events.COMPTE_CREE.equals(recus.type(message))) {
            recus.traiter(message, CompteCreeEvent.class, this::compteCree);
        }
    }

    void compteCree(CompteCreeEvent e) {
        if (!Roles.ENTREPRISE.equals(e.type()) || demandes.existsByKeycloakUserId(e.keycloakUserId())) {
            return;
        }
        DemandeRattachement d = new DemandeRattachement();
        d.setKeycloakUserId(e.keycloakUserId());
        d.setNom((e.prenom() + " " + e.nom()).trim());
        d.setEmail(e.email());
        d.setTelephone(e.telephone());
        d.setRaisonSociale(e.raisonSociale());
        demandes.save(d);
        log.info("Demande de rattachement enregistrée pour {} ({})", e.email(), e.raisonSociale());
    }
}
