package kr.co.quietpath.domain.notification.repository;

import kr.co.quietpath.domain.notification.entity.NotificationDelivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, Long> {

    boolean existsByUserIdAndTypeAndTargetIdAndScheduledDate(
        Long userId,
        String type,
        Long targetId,
        LocalDate scheduledDate
    );
}
