package kr.co.quietpath.api.auth.dto.response;

import kr.co.quietpath.api.auth.dto.OnboardingStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthCallbackResponse {
    private String token;
    private String refreshToken;
    private OnboardingStatus onboardingStatus;
}
