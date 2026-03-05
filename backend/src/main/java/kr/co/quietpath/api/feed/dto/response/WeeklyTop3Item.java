package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WeeklyTop3Item {
    private int rank;
    private Long pathId;
    private String title;
    private String status;
    private OwnerSummary owner;
    private long reactionCount;
    private boolean isReacted;
    private String createdAt;
    private String updatedAt;
}
