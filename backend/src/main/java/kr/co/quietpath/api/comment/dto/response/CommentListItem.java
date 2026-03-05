package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentListItem {
    private Long commentId;
    private Long userId;
    private String nickname;
    private String profileImageUrl;
    private String content;
    private boolean deleted;
    private String createdAt;
    private String updatedAt;
}
