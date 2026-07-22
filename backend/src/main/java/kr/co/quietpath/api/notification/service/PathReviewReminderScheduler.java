package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.Notification;
import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import kr.co.quietpath.domain.notification.repository.NotificationPreferenceRepository;
import kr.co.quietpath.domain.notification.repository.NotificationRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class PathReviewReminderScheduler {

    static final String TYPE = "PATH_REVIEW_REMINDER";
    private static final String STATUS_ACTIVE = "ACTIVE";

    private final WebPushProperties webPushProperties;
    private final NotificationPreferenceRepository preferenceRepository;
    private final PathRepository pathRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationDeliveryClaimService claimService;
    private final WebPushDeliveryService webPushDeliveryService;
    private final Clock notificationClock;

    @Scheduled(cron = "0 * * * * *")
    public void sendDueReminders() {
        if (!webPushProperties.isConfigured()) {
            return;
        }

        List<NotificationPreference> duePreferences = preferenceRepository.findAllByPathEndEnabledTrue()
            .stream()
            .filter(this::isDueNow)
            .toList();
        if (duePreferences.isEmpty()) {
            return;
        }

        Map<Long, NotificationPreference> preferencesByUser = duePreferences.stream()
            .collect(Collectors.toMap(NotificationPreference::getUserId, Function.identity()));
        List<Path> activePaths = pathRepository.findByUserIdInAndStatus(
            List.copyOf(preferencesByUser.keySet()),
            STATUS_ACTIVE
        );

        for (Path path : activePaths) {
            NotificationPreference preference = preferencesByUser.get(path.getUserId());
            LocalDate localDate = localNow(preference).toLocalDate();
            if (!path.getReviewAt().toLocalDate().equals(localDate)) {
                continue;
            }
            sendReminder(path, localDate);
        }
    }

    private boolean isDueNow(NotificationPreference preference) {
        try {
            LocalTime now = localNow(preference).toLocalTime().withSecond(0).withNano(0);
            return now.equals(preference.getPathEndTime());
        } catch (DateTimeException exception) {
            log.warn("Skip invalid notification timezone: userId={}, timezone={}",
                preference.getUserId(), preference.getTimeZone());
            return false;
        }
    }

    private ZonedDateTime localNow(NotificationPreference preference) {
        return notificationClock.instant().atZone(ZoneId.of(preference.getTimeZone()));
    }

    private void sendReminder(Path path, LocalDate scheduledDate) {
        if (!claimService.tryClaim(path.getUserId(), TYPE, path.getId(), scheduledDate)) {
            return;
        }

        String message = String.format("'%s'에서 걸어온 장면을 돌아볼 시간이에요.", path.getDirectionName());
        notificationRepository.save(Notification.builder()
            .recipientUserId(path.getUserId())
            .type(TYPE)
            .targetType("PATH")
            .targetId(path.getId())
            .message(message)
            .build());

        webPushDeliveryService.sendToUser(path.getUserId(), new WebPushPayload(
            "회고를 열어볼 시간이에요",
            message,
            "/",
            "path-review-" + path.getId() + "-" + scheduledDate
        ));
    }
}
