package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordTodayResponse {
    private Long id;
    private Long pathId;
    private String recordDate;
    private String content;
    private String visibility;
    private String createdAt;
}
