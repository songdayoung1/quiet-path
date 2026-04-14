package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PathFinishResponse {
    private Long pathId;
    private String status;
    private String completedAt;
}
