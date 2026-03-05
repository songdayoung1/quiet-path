package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentCreateResponse {
    private Long commentId;
    private String targetType;
    private Long targetId;
    private Long userId;
    private String content;
    private boolean deleted;
    private String createdAt;
}
