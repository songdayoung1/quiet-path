package kr.co.quietpath.api.path.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class PathCoverImageUpdateRequest {

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private BigDecimal positionX;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private BigDecimal positionY;

    @DecimalMin("1.0")
    @DecimalMax("3.0")
    private BigDecimal scale;
}
