package kr.co.quietpath.api.reaction.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReactionCountResponse {
    private String targetType;
    private Long targetId;
    private long reactionCount;
}
