package kr.co.quietpath.api.record.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RecordUpdateRequest {

    @NotBlank
    private String content;

    private String oneWordText;

    private String tomorrowText;

    private String moodCode;

    private RecordImageAction imageAction = RecordImageAction.KEEP;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private java.math.BigDecimal imagePositionX;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private java.math.BigDecimal imagePositionY;

    @DecimalMin("1.0")
    @DecimalMax("3.0")
    private java.math.BigDecimal imageScale;
}
