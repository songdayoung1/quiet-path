package kr.co.quietpath.api.record.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RecordUpdateRequest {

    @NotBlank
    private String content;

    @NotBlank
    private String visibility;
}
