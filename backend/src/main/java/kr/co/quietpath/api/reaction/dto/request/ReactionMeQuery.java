package kr.co.quietpath.api.reaction.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ReactionMeQuery {

    @NotBlank
    private String targetType;

    @NotNull
    private Long targetId;
}
