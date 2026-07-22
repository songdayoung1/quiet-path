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

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "notification_preferences", uniqueConstraints = {
    @UniqueConstraint(name = "uk_notification_preferences_user", columnNames = "user_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationPreference {

    public static final LocalTime DEFAULT_REVIEW_REMINDER_TIME = LocalTime.of(21, 0);
    public static final String DEFAULT_TIME_ZONE = "Asia/Seoul";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    private boolean reactionEnabled;

    @Column(nullable = false)
    private boolean commentEnabled;

    @Column(nullable = false)
    private boolean reviewReminderEnabled;

    @Column(nullable = false)
    private LocalTime reviewReminderTime;

    @Column(nullable = false, length = 50)
    private String timeZone;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private NotificationPreference(Long userId) {
        this.userId = userId;
        this.reactionEnabled = false;
        this.commentEnabled = false;
        this.reviewReminderEnabled = false;
        this.reviewReminderTime = DEFAULT_REVIEW_REMINDER_TIME;
        this.timeZone = DEFAULT_TIME_ZONE;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public static NotificationPreference createDefault(Long userId) {
        return new NotificationPreference(userId);
    }

    public void update(
        boolean reactionEnabled,
        boolean commentEnabled,
        boolean reviewReminderEnabled,
        LocalTime reviewReminderTime,
        String timeZone
    ) {
        this.reactionEnabled = reactionEnabled;
        this.commentEnabled = commentEnabled;
        this.reviewReminderEnabled = reviewReminderEnabled;
        this.reviewReminderTime = reviewReminderTime;
        this.timeZone = timeZone;
        this.updatedAt = LocalDateTime.now();
    }
}
