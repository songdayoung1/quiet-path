package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PathListItem {
    private Long pathId;
    private String startDate;
    private String endDate;
    private String keyQuestion;
}
