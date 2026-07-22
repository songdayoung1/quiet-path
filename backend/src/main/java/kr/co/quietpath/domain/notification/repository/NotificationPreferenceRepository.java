package kr.co.quietpath.domain.notification.repository;

import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    Optional<NotificationPreference> findByUserId(Long userId);

    List<NotificationPreference> findAllByReviewReminderEnabledTrue();
}
