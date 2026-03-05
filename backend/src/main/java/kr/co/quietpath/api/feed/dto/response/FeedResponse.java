package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class FeedResponse {
    private List<FeedItem> items;
    private boolean hasNext;
    private String nextCursor;
}
