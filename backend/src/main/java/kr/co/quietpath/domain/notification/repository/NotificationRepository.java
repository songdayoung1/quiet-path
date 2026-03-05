package kr.co.quietpath.domain.notification.repository;

import kr.co.quietpath.domain.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Notification n set n.read = true, n.readAt = :readAt "
        + "where n.recipientUserId = :recipientUserId and n.read = false")
    int markAllAsRead(@Param("recipientUserId") Long recipientUserId, @Param("readAt") LocalDateTime readAt);
}
