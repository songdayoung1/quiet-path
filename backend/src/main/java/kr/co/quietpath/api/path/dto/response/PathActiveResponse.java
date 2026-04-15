package kr.co.quietpath.api.path.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PathActiveResponse {
    private Long pathId;
    private String directionName;
    private String directionText;
    private String status;
    private String createdAt;
    private String reviewAt;

    public static PathActiveResponse empty() {
        return PathActiveResponse.builder()
            .pathId(null)
            .build();
    }
}
