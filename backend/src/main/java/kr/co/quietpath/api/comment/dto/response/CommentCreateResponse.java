package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentCreateResponse {
    private Long commentId;
    private Long recordId;
    private Long userId;
    private String content;
    private long commentCount;
    private boolean deleted;
    private String createdAt;
}
