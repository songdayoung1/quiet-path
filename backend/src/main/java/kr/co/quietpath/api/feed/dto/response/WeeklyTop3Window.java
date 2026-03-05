package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WeeklyTop3Window {
    private String from;
    private String to;
}
