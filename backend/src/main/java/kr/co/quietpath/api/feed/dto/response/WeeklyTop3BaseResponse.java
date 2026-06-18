package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.annotation.JsonPOJOBuilder;

import java.util.List;

@Getter
@Builder
@JsonDeserialize(builder = WeeklyTop3BaseResponse.WeeklyTop3BaseResponseBuilder.class)
public class WeeklyTop3BaseResponse {
    private WeeklyTop3Window window;
    private List<WeeklyTop3BaseItem> items;

    @JsonPOJOBuilder(withPrefix = "")
    public static class WeeklyTop3BaseResponseBuilder {
    }
}
