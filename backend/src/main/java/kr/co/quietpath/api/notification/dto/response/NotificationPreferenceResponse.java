package kr.co.quietpath.api.notification.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationPreferenceResponse {
    private boolean reactionEnabled;
    private boolean commentEnabled;
    private boolean reviewReminderEnabled;
    private String reviewReminderTime;
    private String timeZone;
}
