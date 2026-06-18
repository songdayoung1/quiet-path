package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.annotation.JsonPOJOBuilder;

@Getter
@Builder
@JsonDeserialize(builder = WeeklyTop3Window.WeeklyTop3WindowBuilder.class)
public class WeeklyTop3Window {
    private String from;
    private String to;

    @JsonPOJOBuilder(withPrefix = "")
    public static class WeeklyTop3WindowBuilder {
    }
}
