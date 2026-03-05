package kr.co.quietpath.api.record.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordShareResponse {
    private Long id;
    private String visibility;
}
