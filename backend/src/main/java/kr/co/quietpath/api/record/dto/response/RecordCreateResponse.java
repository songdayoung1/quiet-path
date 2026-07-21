package kr.co.quietpath.api.record.dto.response;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordCreateResponse {
    private Long id;
    private Long pathId;
    private String categoryCode;
    private String recordDate;
    private String content;
    private String oneWordText;
    private String tomorrowText;
    private String moodCode;
    private String imageUrl;
    private BigDecimal imagePositionX;
    private BigDecimal imagePositionY;
    private BigDecimal imageScale;
    private String visibility;
    private String sharedAt;
    private String createdAt;
}
