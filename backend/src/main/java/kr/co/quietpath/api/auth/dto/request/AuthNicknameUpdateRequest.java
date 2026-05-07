package kr.co.quietpath.api.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AuthNicknameUpdateRequest {

    @NotBlank
    private String nickname;
}

