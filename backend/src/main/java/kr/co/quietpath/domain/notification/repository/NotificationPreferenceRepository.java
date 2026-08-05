package kr.co.quietpath.domain.notification.repository;

import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalTime;
import java.util.Optional;
import java.util.List;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    Optional<NotificationPreference> findByUserId(Long userId);

    long deleteAllByUserId(Long userId);

    @Query("select distinct p.timeZone from NotificationPreference p where p.reviewReminderEnabled = true")
    List<String> findDistinctTimeZonesByReviewReminderEnabledTrue();

    List<NotificationPreference> findAllByReviewReminderEnabledTrueAndTimeZoneAndReviewReminderTime(
        String timeZone,
        LocalTime reviewReminderTime
    );
}
