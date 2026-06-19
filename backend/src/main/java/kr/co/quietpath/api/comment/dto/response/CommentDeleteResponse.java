package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentDeleteResponse {
    private Long commentId;
    private Long recordId;
    private long commentCount;
    private boolean deleted;
    private String deletedAt;
}
