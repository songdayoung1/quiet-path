package kr.co.quietpath.api.comment.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CommentListResponse {
    private List<CommentListItem> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
