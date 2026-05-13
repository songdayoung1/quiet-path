package kr.co.quietpath.api.auth.dto.response;

import kr.co.quietpath.api.auth.dto.OnboardingStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthMeResponse {
    private Long id;
    private String nickname;
    private OnboardingStatus onboardingStatus;
}

