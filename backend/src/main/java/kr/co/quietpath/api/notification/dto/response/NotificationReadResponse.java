package kr.co.quietpath.api.notification.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationReadResponse {
    private Long notificationId;
    private boolean read;
    private String readAt;
}
