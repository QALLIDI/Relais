package ma.recrutement.candidat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

/** Stockage des CV sur disque : rangement, relecture, suppression et refus des chemins hors du dossier. */
class CvStorageTest {

    @TempDir
    Path dossier;

    CvStorage stockage;

    @BeforeEach
    void preparer() throws IOException {
        stockage = new CvStorage(dossier.toString());
        stockage.preparer();
    }

    private static MockMultipartFile pdf(String nom, String contenu) {
        return new MockMultipartFile("fichier", nom, "application/pdf", contenu.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void enregistreDansLeDossierDuCandidatPuisRelit() throws IOException {
        UUID candidat = UUID.randomUUID();

        String cle = stockage.enregistrer(candidat, pdf("Mon CV (2026).pdf", "contenu du cv"));

        assertThat(cle).startsWith(candidat + "/").endsWith("-Mon_CV__2026_.pdf");
        assertThat(dossier.resolve(cle)).exists();
        try (InputStream in = stockage.lire(cle)) {
            assertThat(new String(in.readAllBytes(), StandardCharsets.UTF_8)).isEqualTo("contenu du cv");
        }
    }

    @Test
    void neLaissePasDeFichierTemporaire() throws IOException {
        UUID candidat = UUID.randomUUID();
        stockage.enregistrer(candidat, pdf("cv.pdf", "x"));

        try (var fichiers = Files.list(dossier.resolve(candidat.toString()))) {
            assertThat(fichiers).hasSize(1).allMatch(f -> f.getFileName().toString().endsWith("-cv.pdf"));
        }
    }

    @Test
    void supprimeLeFichierEtLeDossierVideDuCandidat() {
        UUID candidat = UUID.randomUUID();
        String cle = stockage.enregistrer(candidat, pdf("cv.pdf", "x"));

        stockage.supprimer(cle);

        assertThat(dossier.resolve(cle)).doesNotExist();
        assertThat(dossier.resolve(candidat.toString())).doesNotExist();
        assertThat(dossier).exists();
    }

    @Test
    void refuseUneCleQuiSortDuDossier() {
        assertThatThrownBy(() -> stockage.lire("../../etc/passwd")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> stockage.supprimer("../autre/cv.pdf")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> stockage.lire("")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cvAbsentDonneUneErreurClaire() {
        assertThatThrownBy(() -> stockage.lire(UUID.randomUUID() + "/absent.pdf"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("introuvable");
    }
}
