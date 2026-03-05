package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PathDetailResponse {
    private Long pathId;
    private String keyQuestion;
    private String description;
    private String status;
    private Period period;
    private String summary;
    private String summaryStatus;
    private String unlockAt;
    private List<PathRecordItem> records;

    @Getter
    @Builder
    public static class Period {
        private String startDate;
        private String endDate;
    }
}
