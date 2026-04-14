package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PathListItem {
    private Long pathId;
    private String createdAt;
    private String completedAt;
    private String directionName;
}
