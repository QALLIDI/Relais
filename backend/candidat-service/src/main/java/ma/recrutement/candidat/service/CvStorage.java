package ma.recrutement.candidat.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stockage des CV dans un dossier du disque (remplace MinIO).
 *
 * <p>Chaque CV est rangé sous {@code <dossier>/<candidatId>/<uuid>-<nom>} ; la clé enregistrée en base
 * ({@code cvObjectKey}) est ce chemin relatif, au même format qu'avec MinIO. En Docker, le dossier du
 * conteneur est monté sur un dossier du PC (voir {@code CV_DIR} dans {@code .env}).</p>
 */
@Slf4j
@Component
public class CvStorage {

    private final Path racine;

    public CvStorage(@Value("${app.cv.dossier}") String dossier) {
        this.racine = Path.of(dossier).toAbsolutePath().normalize();
    }

    @PostConstruct
    void preparer() throws IOException {
        Files.createDirectories(racine);
        if (!Files.isWritable(racine)) {
            throw new IllegalStateException("Dossier des CV non accessible en écriture : " + racine);
        }
        log.info("CV stockés dans {}", racine);
    }

    public String enregistrer(UUID candidatId, MultipartFile fichier) {
        String key = candidatId + "/" + UUID.randomUUID() + "-" + nettoyer(fichier.getOriginalFilename());
        Path cible = resoudre(key);
        try {
            Files.createDirectories(cible.getParent());
            // Écriture dans un fichier temporaire puis renommage : jamais de CV à moitié écrit.
            Path tmp = Files.createTempFile(cible.getParent(), ".envoi-", ".part");
            try (InputStream in = fichier.getInputStream()) {
                Files.copy(in, tmp, StandardCopyOption.REPLACE_EXISTING);
                Files.move(tmp, cible, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(tmp);
            }
            return key;
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'enregistrer le CV", e);
        }
    }

    public InputStream lire(String key) {
        try {
            return Files.newInputStream(resoudre(key));
        } catch (NoSuchFileException e) {
            throw new IllegalStateException("CV introuvable dans le stockage", e);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de lire le CV", e);
        }
    }

    public void supprimer(String key) {
        try {
            Path f = resoudre(key);
            Files.deleteIfExists(f);
            // Retire le dossier du candidat s'il est vide.
            Path dossier = f.getParent();
            if (!dossier.equals(racine)) {
                try (var contenu = Files.list(dossier)) {
                    if (contenu.findAny().isEmpty()) Files.deleteIfExists(dossier);
                }
            }
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de supprimer le CV", e);
        }
    }

    /** Chemin absolu d'une clé, en refusant toute sortie du dossier racine (« ../ »). */
    private Path resoudre(String key) {
        Path p = racine.resolve(key).normalize();
        if (!p.startsWith(racine) || p.equals(racine)) {
            throw new IllegalArgumentException("Clé de CV invalide");
        }
        return p;
    }

    private static String nettoyer(String nom) {
        return nom == null ? "cv" : nom.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
