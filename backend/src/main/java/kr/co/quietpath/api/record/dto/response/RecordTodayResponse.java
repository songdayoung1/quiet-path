package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordTodayResponse {
    private Long id;
    private Long pathId;
    private String directionName;
    private String directionText;
    private String categoryCode;
    private String recordDate;
    private String content;
    private String oneWordText;
    private String tomorrowText;
    private String moodCode;
    private String imageUrl;
    private String visibility;
    private String sharedAt;
    private String createdAt;
}
