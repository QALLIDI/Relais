package ma.recrutement.agenda.domain;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import ma.recrutement.agenda.domain.Enums.Nature;
import ma.recrutement.agenda.domain.Enums.Statut;
import ma.recrutement.agenda.domain.Enums.Type;

/**
 * Réunion autour d'une candidature. La mission, l'entreprise et le candidat sont copiés à la création
 * (lus dans selection-service) pour que l'agenda reste lisible si ce service est indisponible.
 */
@Entity
@Table(name = "reunion")
@Getter
@Setter
public class Reunion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID candidatureId;
    private UUID missionId;
    private UUID entrepriseId;
    private String missionIntitule;
    private String entrepriseNom;
    private UUID candidatId;
    private String candidatNom;
    private String candidatEmail;
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Nature nature = Nature.ENTRETIEN_CLIENT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type = Type.VISIO;

    private int dureeMinutes = 60;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Statut statut = Statut.A_PLANIFIER;

    private String lieu;
    private String lienVisio;

    /** Créneau confirmé (UTC), null tant que le candidat n'a pas choisi. */
    private OffsetDateTime debut;
    private OffsetDateTime fin;

    /** Motif du dernier report ou de l'annulation. */
    private String motif;

    @Column(columnDefinition = "text")
    private String compteRendu;

    private String proposeePar;
    private boolean rappelEmailEnvoye;
    private boolean rappelSmsEnvoye;

    @OneToMany(mappedBy = "reunion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("debut")
    private List<Creneau> creneaux = new ArrayList<>();

    @OneToMany(mappedBy = "reunion", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Participant> participants = new ArrayList<>();

    @OneToOne(mappedBy = "reunion", cascade = CascadeType.ALL, orphanRemoval = true)
    private Evaluation evaluation;

    private OffsetDateTime createdAt = OffsetDateTime.now();
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public void ajouterCreneau(OffsetDateTime debutCreneau) {
        Creneau c = new Creneau();
        c.setReunion(this);
        c.setDebut(debutCreneau);
        c.setFin(debutCreneau.plusMinutes(dureeMinutes));
        creneaux.add(c);
    }

    public void ajouterParticipant(String nom, String email, Enums.Role role, Enums.Reponse reponse) {
        ajouterParticipant(nom, email, role, reponse, false);
    }

    /** Ajoute un participant, sauf si son adresse figure déjà parmi les participants. */
    public void ajouterParticipant(String nom, String email, Enums.Role role, Enums.Reponse reponse, boolean facultatif) {
        if (email != null && participants.stream().anyMatch(p -> email.equalsIgnoreCase(p.getEmail()))) {
            return;
        }
        Participant p = new Participant();
        p.setReunion(this);
        p.setNom(nom);
        p.setEmail(email);
        p.setRole(role);
        p.setReponse(reponse);
        p.setFacultatif(facultatif);
        participants.add(p);
    }

    public List<String> emails() {
        return participants.stream().map(Participant::getEmail).filter(e -> e != null && !e.isBlank()).toList();
    }

    public void passerA(Statut nouveau) {
        this.statut = nouveau;
        this.updatedAt = OffsetDateTime.now();
    }
}
