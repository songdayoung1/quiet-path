package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PathCreateResponse {
    private Long pathId;
    private String status;
    private String createdAt;
    private String reviewAt;
}
