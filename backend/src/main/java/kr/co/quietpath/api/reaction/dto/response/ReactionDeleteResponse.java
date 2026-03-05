package kr.co.quietpath.api.reaction.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReactionDeleteResponse {
    private String targetType;
    private Long targetId;
    private boolean reacted;
    private long reactionCount;
}
