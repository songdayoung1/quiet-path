package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordUpdateResponse {
    private Long id;
    private String content;
    private String oneWordText;
    private String tomorrowText;
    private String moodCode;
    private String imageUrl;
    private String visibility;
    private String updatedAt;
}
