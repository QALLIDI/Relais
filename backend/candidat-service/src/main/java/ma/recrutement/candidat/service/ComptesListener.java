package ma.recrutement.candidat.service;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.recrutement.candidat.domain.Candidat;
import ma.recrutement.candidat.repository.CandidatRepository;
import ma.recrutement.common.events.CandidatEvent;
import ma.recrutement.common.events.CompteCreeEvent;
import ma.recrutement.common.events.EvenementsRecus;
import ma.recrutement.common.events.EventPublisher;
import ma.recrutement.common.events.Events;
import ma.recrutement.common.events.Topics;
import ma.recrutement.common.security.Roles;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Compte candidat créé par l'inscription : un profil vide est préparé, que le candidat complète
 * ensuite depuis son CV. Un profil déjà sourcé avec le même e-mail est rattaché au compte.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ComptesListener {

    private final EvenementsRecus recus;
    private final CandidatRepository candidats;
    private final EventPublisher events;

    @KafkaListener(topics = Topics.COMPTE)
    @Transactional
    public void recevoir(ConsumerRecord<String, String> message) {
        if (Events.COMPTE_CREE.equals(recus.type(message))) {
            recus.traiter(message, CompteCreeEvent.class, this::compteCree);
        }
    }

    void compteCree(CompteCreeEvent e) {
        if (!Roles.CANDIDAT.equals(e.type()) || candidats.findByKeycloakUserId(e.keycloakUserId()).isPresent()) {
            return;
        }
        Candidat c = candidats.findFirstByEmailIgnoreCase(e.email())
                .filter(existant -> existant.getKeycloakUserId() == null)
                .orElseGet(Candidat::new);
        boolean nouveau = c.getId() == null;
        c.setKeycloakUserId(e.keycloakUserId());
        if (nouveau) {
            c.setNomComplet((e.prenom() + " " + e.nom()).trim());
            c.setEmail(e.email());
            c.setSource("Inscription en ligne");
        }
        if (c.getTelephone() == null) {
            c.setTelephone(e.telephone());
        }
        candidats.save(c);
        log.info("Profil candidat {} {} pour le compte {}", c.getId(), nouveau ? "créé" : "rattaché", e.keycloakUserId());
        if (nouveau) {
            events.publier(Topics.CANDIDAT, Events.CANDIDAT_CREE, c.getId(), new CandidatEvent(c.getId(), c.getNomComplet(),
                    c.getTitre(), c.getAnneesExperience(), c.getVille(), List.copyOf(c.getCompetences())));
        }
    }
}
