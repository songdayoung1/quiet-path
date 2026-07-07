package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordPinResponse {
    private Long id;
    private Boolean isPinned;
}
