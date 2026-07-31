package kr.co.quietpath.api.notification.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WebPushSubscriptionResponse {
    private boolean subscribed;
}
