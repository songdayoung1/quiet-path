package kr.co.quietpath.api.path.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
public class PathCreateRequest {

    @NotBlank
    private String keyQuestion;

    private String description;

    private DurationType durationType;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;
}
