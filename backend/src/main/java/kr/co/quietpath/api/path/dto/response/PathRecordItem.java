package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PathRecordItem {
    private Long recordId;
    private String date;
    private String preview;
    private String moodText;
}
