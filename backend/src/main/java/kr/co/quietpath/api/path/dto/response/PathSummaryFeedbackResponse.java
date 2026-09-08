package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PathSummaryFeedbackResponse {
    private Long pathId;
    private boolean helpful;
}
