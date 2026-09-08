package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PathSummaryStartResponse {
    private Long pathId;
    private String summaryStatus;
    private int regenerationCount;
    private int regenerationLimit;
    private int regenerationRemaining;
}
