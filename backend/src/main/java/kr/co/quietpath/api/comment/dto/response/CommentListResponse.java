package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.annotation.JsonPOJOBuilder;

import java.util.List;

@Getter
@Builder
@JsonDeserialize(builder = CommentListResponse.CommentListResponseBuilder.class)
public class CommentListResponse {
    private List<CommentListItem> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    @JsonPOJOBuilder(withPrefix = "")
    public static class CommentListResponseBuilder {
    }
}
