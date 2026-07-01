package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RecordMonthlyResponse {
    private Integer year;
    private Integer month;
    private Integer firstRecordYear;
    private Integer firstRecordMonth;
    private Integer recordsCount;
    private Integer photoCount;
    private Integer photoCoverage;
    private List<RecordListItem> items;
}
