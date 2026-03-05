package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FeedItem {
    private Long pathId;
    private Long recordId;
    private String title;
    private String content;
    private String status;
    private OwnerSummary owner;
    private long reactionCount;
    private boolean isReacted;
    private String createdAt;
}
