package kr.co.quietpath.api.path.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PathCoverImageResponse {
    private String imageUrl;
    private BigDecimal positionX;
    private BigDecimal positionY;
    private BigDecimal scale;
}
