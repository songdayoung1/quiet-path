package kr.co.quietpath.api.notification.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ActorSummary {
    private Long userId;
    private String nickname;
    private String profileImageUrl;
}
