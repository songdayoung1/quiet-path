package kr.co.quietpath.api.reaction.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReactionCreateResponse {
    private Long reactionId;
    private String targetType;
    private Long targetId;
    private boolean reacted;
    private long reactionCount;
    private String reactedAt;
}
