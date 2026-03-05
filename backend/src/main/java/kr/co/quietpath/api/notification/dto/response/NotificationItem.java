package kr.co.quietpath.api.notification.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationItem {
    private Long notificationId;
    private String type;
    private ActorSummary actor;
    private String targetType;
    private Long targetId;
    private String message;
    private boolean read;
    private String createdAt;
    private String readAt;
}
