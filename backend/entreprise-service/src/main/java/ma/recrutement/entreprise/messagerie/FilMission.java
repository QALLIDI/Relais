package ma.recrutement.entreprise.messagerie;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * État d'envoi des e-mails d'un fil : un côté « en attente » a déjà reçu un e-mail et ne
 * l'a pas encore ouvert ; il n'en reçoit pas d'autre d'ici là.
 */
@Entity
@Table(name = "fil_mission")
@Getter
@Setter
@NoArgsConstructor
public class FilMission {

    @Id
    private UUID missionId;

    private boolean attenteRecruteur;

    private boolean attenteEntreprise;

    public FilMission(UUID missionId) {
        this.missionId = missionId;
    }
}
