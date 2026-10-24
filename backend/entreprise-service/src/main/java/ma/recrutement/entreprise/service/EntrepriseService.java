package ma.recrutement.entreprise.service;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import ma.recrutement.common.web.NotFoundException;
import ma.recrutement.entreprise.domain.Contact;
import ma.recrutement.entreprise.domain.Entreprise;
import ma.recrutement.entreprise.domain.ModeleTarif;
import ma.recrutement.entreprise.domain.StatutMission;
import ma.recrutement.entreprise.repository.EntrepriseRepository;
import ma.recrutement.entreprise.repository.MissionRepository;
import ma.recrutement.entreprise.web.Dtos.ContactDto;
import ma.recrutement.entreprise.web.Dtos.EntrepriseDto;
import ma.recrutement.entreprise.web.Dtos.EntrepriseRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EntrepriseService {

    private final EntrepriseRepository entreprises;
    private final MissionRepository missions;

    @Transactional(readOnly = true)
    public List<EntrepriseDto> lister() {
        return entreprises.findAllByOrderByRaisonSocialeAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public EntrepriseDto detail(UUID id) {
        return toDto(charger(id));
    }

    public EntrepriseDto creer(EntrepriseRequest req) {
        Entreprise e = new Entreprise();
        appliquer(e, req);
        return toDto(entreprises.save(e));
    }

    public EntrepriseDto modifier(UUID id, EntrepriseRequest req) {
        Entreprise e = charger(id);
        appliquer(e, req);
        return toDto(e);
    }

    private void appliquer(Entreprise e, EntrepriseRequest req) {
        e.setRaisonSociale(req.raisonSociale());
        e.setIce(req.ice());
        e.setSecteur(req.secteur());
        e.setVille(req.ville());
        e.setTaille(req.taille());
        e.setTauxHonoraires(req.tauxHonoraires());
        e.setModeleTarif(req.modeleTarif() == null ? ModeleTarif.POURCENTAGE : req.modeleTarif());
        e.setAcompte(req.acompte());
        if (req.contacts() != null) {
            e.getContacts().clear();
            for (ContactDto c : req.contacts()) {
                Contact contact = new Contact();
                contact.setEntreprise(e);
                contact.setNom(c.nom());
                contact.setFonction(c.fonction());
                contact.setEmail(c.email());
                contact.setTelephone(c.telephone());
                e.getContacts().add(contact);
            }
        }
    }

    private EntrepriseDto toDto(Entreprise e) {
        long ouvertes = missions.findByEntrepriseIdOrderByCreatedAtDesc(e.getId()).stream()
                .filter(m -> m.getStatut() == StatutMission.OUVERTE).count();
        return EntrepriseDto.of(e, ouvertes);
    }

    private Entreprise charger(UUID id) {
        return entreprises.findById(id).orElseThrow(() -> new NotFoundException("Entreprise introuvable"));
    }
}
