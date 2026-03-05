package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentDeleteResponse {
    private Long commentId;
    private boolean deleted;
    private String deletedAt;
}
