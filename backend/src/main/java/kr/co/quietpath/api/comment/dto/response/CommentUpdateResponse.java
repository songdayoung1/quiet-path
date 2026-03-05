package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentUpdateResponse {
    private Long commentId;
    private String content;
    private String updatedAt;
}
