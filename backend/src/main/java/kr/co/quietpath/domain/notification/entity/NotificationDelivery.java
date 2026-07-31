package kr.co.quietpath.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_deliveries", uniqueConstraints = {
    @UniqueConstraint(
        name = "uk_notification_deliveries_event",
        columnNames = {"user_id", "type", "target_id", "scheduled_date"}
    )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false)
    private Long targetId;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private NotificationDelivery(Long userId, String type, Long targetId, LocalDate scheduledDate) {
        this.userId = userId;
        this.type = type;
        this.targetId = targetId;
        this.scheduledDate = scheduledDate;
        this.createdAt = LocalDateTime.now();
    }

    public static NotificationDelivery create(
        Long userId,
        String type,
        Long targetId,
        LocalDate scheduledDate
    ) {
        return new NotificationDelivery(userId, type, targetId, scheduledDate);
    }
}
