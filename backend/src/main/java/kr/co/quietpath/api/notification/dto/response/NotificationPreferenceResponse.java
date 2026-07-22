package kr.co.quietpath.api.notification.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationPreferenceResponse {
    private boolean reactionEnabled;
    private boolean commentEnabled;
    private boolean pathEndEnabled;
    private String pathEndTime;
    private String timeZone;
}
