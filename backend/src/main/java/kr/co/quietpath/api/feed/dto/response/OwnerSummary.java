package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.annotation.JsonPOJOBuilder;

@Getter
@Builder
@JsonDeserialize(builder = OwnerSummary.OwnerSummaryBuilder.class)
public class OwnerSummary {
    private Long userId;
    private String nickname;
    private String profileImageUrl;

    @JsonPOJOBuilder(withPrefix = "")
    public static class OwnerSummaryBuilder {
    }
}
