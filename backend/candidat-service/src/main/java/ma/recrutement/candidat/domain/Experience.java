package ma.recrutement.candidat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class Experience {
    private String periode;
    private String poste;
    private String employeur;
    @Column(columnDefinition = "text")
    private String description;
}
