package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.annotation.JsonPOJOBuilder;

@Getter
@Builder
@JsonDeserialize(builder = CommentListItem.CommentListItemBuilder.class)
public class CommentListItem {
    private Long commentId;
    private Long userId;
    private String nickname;
    private String profileImageUrl;
    private String content;
    private boolean deleted;
    private String createdAt;
    private String updatedAt;

    @JsonPOJOBuilder(withPrefix = "")
    public static class CommentListItemBuilder {
    }
}
