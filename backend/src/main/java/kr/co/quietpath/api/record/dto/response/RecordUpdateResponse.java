package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordUpdateResponse {
    private Long id;
    private String content;
    private String visibility;
    private String updatedAt;
}
