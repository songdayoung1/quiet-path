package kr.co.quietpath.api.comment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CommentCreateRequest {

    @NotBlank
    private String targetType;

    @NotNull
    private Long targetId;

    @NotBlank
    private String content;
}
