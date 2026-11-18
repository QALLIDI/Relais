package ma.recrutement.compte.inscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** Numéros de l'inscription : format E.164, pays (seuls certains reçoivent un SMS), masquage. */
class TelephonesTest {

    @Test
    void unNumeroSansIndicatifEstLuCommeMarocain() {
        assertThat(Telephones.normaliser("06 12 34 56 78")).isEqualTo("+212612345678");
        assertThat(Telephones.normaliser("+212 6 12 34 56 78")).isEqualTo("+212612345678");
    }

    @Test
    void donneLePaysDuNumero() {
        assertThat(Telephones.pays("+212612345678")).isEqualTo("MA");
        assertThat(Telephones.pays("+33612345678")).isEqualTo("FR");
        assertThat(Telephones.pays("pas un numéro")).isNull();
    }

    @Test
    void refuseUnNumeroInvalide() {
        assertThatThrownBy(() -> Telephones.normaliser("12")).isInstanceOf(InscriptionException.class);
        assertThatThrownBy(() -> Telephones.normaliser("abc")).isInstanceOf(InscriptionException.class);
    }

    @Test
    void masqueLeNumeroSaufLesDeuxDerniersChiffres() {
        assertThat(Telephones.masquer("+212612345678")).isEqualTo("+212 6•• •• •• 78");
    }
}
