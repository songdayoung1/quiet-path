package kr.co.quietpath.api.comment.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CommentListQuery {

    @NotNull
    private Long recordId;

    private Integer page;

    private Integer size;
}
