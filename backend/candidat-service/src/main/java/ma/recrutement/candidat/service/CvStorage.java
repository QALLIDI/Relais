package ma.recrutement.candidat.service;

import java.io.InputStream;
import java.util.UUID;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stockage des CV dans MinIO (compatible S3). Le bucket est créé au premier envoi.
 */
@Component
@RequiredArgsConstructor
public class CvStorage {

    private final MinioClient minio;

    @Value("${app.minio.bucket:cv}")
    private String bucket;

    public String enregistrer(UUID candidatId, MultipartFile fichier) {
        try {
            if (!minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
                minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
            String key = candidatId + "/" + UUID.randomUUID() + "-" + nettoyer(fichier.getOriginalFilename());
            try (InputStream in = fichier.getInputStream()) {
                minio.putObject(PutObjectArgs.builder()
                        .bucket(bucket)
                        .object(key)
                        .stream(in, fichier.getSize(), -1)
                        .contentType(fichier.getContentType())
                        .build());
            }
            return key;
        } catch (Exception e) {
            throw new IllegalStateException("Impossible d'enregistrer le CV", e);
        }
    }

    public InputStream lire(String key) {
        try {
            return minio.getObject(GetObjectArgs.builder().bucket(bucket).object(key).build());
        } catch (Exception e) {
            throw new IllegalStateException("CV introuvable dans le stockage", e);
        }
    }

    public void supprimer(String key) {
        try {
            minio.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de supprimer le CV", e);
        }
    }

    private static String nettoyer(String nom) {
        return nom == null ? "cv" : nom.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
