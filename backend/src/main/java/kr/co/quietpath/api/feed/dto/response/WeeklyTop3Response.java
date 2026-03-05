package kr.co.quietpath.api.feed.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class WeeklyTop3Response {
    private WeeklyTop3Window window;
    private List<WeeklyTop3Item> items;
}
