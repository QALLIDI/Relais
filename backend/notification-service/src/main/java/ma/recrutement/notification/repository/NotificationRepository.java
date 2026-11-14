package ma.recrutement.notification.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.notification.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop50ByDestinataireIgnoreCaseOrderByCreatedAtDesc(String destinataire);

    long countByDestinataireIgnoreCaseAndLuFalse(String destinataire);

    @Modifying
    @Query("update Notification n set n.lu = true where lower(n.destinataire) = lower(:destinataire) and n.lu = false")
    int marquerToutesLues(@Param("destinataire") String destinataire);
}
