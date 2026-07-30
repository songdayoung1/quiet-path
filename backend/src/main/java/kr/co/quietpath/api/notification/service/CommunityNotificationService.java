package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.domain.notification.entity.Notification;
import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import kr.co.quietpath.domain.notification.repository.NotificationPreferenceRepository;
import kr.co.quietpath.domain.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CommunityNotificationService {

    static final String REACTION_TYPE = "REACTION_CREATED";
    static final String COMMENT_TYPE = "COMMENT_CREATED";
    private static final String TARGET_RECORD = "RECORD";

    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationRepository notificationRepository;
    private final WebPushDeliveryService webPushDeliveryService;

    @Transactional
    public Optional<CommunityNotificationDelivery> createNotification(
        CommunityNotificationRequestedEvent event
    ) {
        if (event.recipientUserId().equals(event.actorUserId())) {
            return Optional.empty();
        }

        NotificationPreference preference = preferenceRepository.findByUserId(event.recipientUserId())
            .orElse(null);
        if (preference == null || !isEnabled(preference, event.type())) {
            return Optional.empty();
        }

        String notificationType = notificationType(event.type());
        String message = message(event.type());
        notificationRepository.save(Notification.builder()
            .recipientUserId(event.recipientUserId())
            .type(notificationType)
            .actorUserId(event.actorUserId())
            .targetType(TARGET_RECORD)
            .targetId(event.recordId())
            .message(message)
            .build());

        return Optional.of(new CommunityNotificationDelivery(
            event.recipientUserId(),
            new WebPushPayload(
                title(event.type()),
                String.format("%s님이 %s", event.actorNickname(), message),
                "/?view=community",
                notificationType.toLowerCase() + "-" + event.sourceId()
            )
        ));
    }

    public void sendWebPush(CommunityNotificationDelivery delivery) {
        webPushDeliveryService.sendToUser(delivery.recipientUserId(), delivery.payload());
    }

    private boolean isEnabled(NotificationPreference preference, CommunityNotificationType type) {
        return switch (type) {
            case REACTION -> preference.isReactionEnabled();
            case COMMENT -> preference.isCommentEnabled();
        };
    }

    private String notificationType(CommunityNotificationType type) {
        return switch (type) {
            case REACTION -> REACTION_TYPE;
            case COMMENT -> COMMENT_TYPE;
        };
    }

    private String title(CommunityNotificationType type) {
        return switch (type) {
            case REACTION -> "새로운 공감이 도착했어요";
            case COMMENT -> "새로운 댓글이 도착했어요";
        };
    }

    private String message(CommunityNotificationType type) {
        return switch (type) {
            case REACTION -> "내 기록에 공감했어요.";
            case COMMENT -> "내 기록에 댓글을 남겼어요.";
        };
    }
}
