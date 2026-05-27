package kr.co.quietpath.api.record.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RecordCreateRequest {

    @NotBlank
    private String content;

    private String oneWordText;

    private String tomorrowText;

    private String moodCode;

    private String imageUrl;

    @NotBlank
    private String visibility;
}
