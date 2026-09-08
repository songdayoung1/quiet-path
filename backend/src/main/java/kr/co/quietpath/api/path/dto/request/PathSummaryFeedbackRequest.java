package kr.co.quietpath.api.path.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PathSummaryFeedbackRequest {

    @NotNull
    private Boolean helpful;
}
