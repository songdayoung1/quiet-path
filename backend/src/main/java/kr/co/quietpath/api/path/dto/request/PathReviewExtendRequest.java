package kr.co.quietpath.api.path.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class PathReviewExtendRequest {
    private LocalDate reviewAt;
}
