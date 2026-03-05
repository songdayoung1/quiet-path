package kr.co.quietpath.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_recipient_created", columnList = "recipient_user_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long recipientUserId;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false)
    private Long actorUserId;

    @Column(nullable = false, length = 20)
    private String targetType;

    @Column(nullable = false)
    private Long targetId;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false)
    private boolean read;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime readAt;

    @Builder
    public Notification(
        Long recipientUserId,
        String type,
        Long actorUserId,
        String targetType,
        Long targetId,
        String message
    ) {
        this.recipientUserId = recipientUserId;
        this.type = type;
        this.actorUserId = actorUserId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.message = message;
        this.read = false;
        this.createdAt = LocalDateTime.now();
    }

    public void markRead(LocalDateTime readAt) {
        if (!this.read) {
            this.read = true;
            this.readAt = readAt;
        }
    }
}
