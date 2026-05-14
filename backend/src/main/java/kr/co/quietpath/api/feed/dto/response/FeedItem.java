package kr.co.quietpath.api.feed.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    private String categoryCode;
    private long reactionCount;
    private long commentCount;
    @JsonProperty("isReacted")
    private boolean isReacted;
    private String sharedAt;
    private String createdAt;
}
