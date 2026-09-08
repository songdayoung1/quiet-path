package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PathDetailResponse {
    private Long pathId;
    private String directionName;
    private String directionText;
    private String status;
    private String createdAt;
    private String reviewAt;
    private String completedAt;
    private PathSummaryPayload summary;
    private String summaryStatus;
    private int summaryRegenerationCount;
    private int summaryRegenerationLimit;
    private int summaryRegenerationRemaining;
    private Boolean summaryHelpful;
    private List<PathRecordItem> records;
}
