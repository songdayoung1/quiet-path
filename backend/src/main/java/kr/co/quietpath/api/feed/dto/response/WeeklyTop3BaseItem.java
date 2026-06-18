package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.annotation.JsonPOJOBuilder;

@Getter
@Builder
@JsonDeserialize(builder = WeeklyTop3BaseItem.WeeklyTop3BaseItemBuilder.class)
public class WeeklyTop3BaseItem {
    private Long pathId;
    private Long recordId;
    private String title;
    private String content;
    private String status;
    private OwnerSummary owner;
    private String categoryCode;
    private long reactionCount;
    private long commentCount;
    private String sharedAt;
    private String createdAt;

    @JsonPOJOBuilder(withPrefix = "")
    public static class WeeklyTop3BaseItemBuilder {
    }
}
