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
    private String summary;
    private String summaryStatus;
    private List<PathRecordItem> records;
}
