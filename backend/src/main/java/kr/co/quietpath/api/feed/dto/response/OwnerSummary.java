package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OwnerSummary {
    private Long userId;
    private String nickname;
    private String profileImageUrl;
}
