package ma.recrutement.notification.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.notification.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop50ByDestinataireIgnoreCaseOrderByCreatedAtDesc(String destinataire);

    long countByDestinataireIgnoreCaseAndLuFalse(String destinataire);
}
