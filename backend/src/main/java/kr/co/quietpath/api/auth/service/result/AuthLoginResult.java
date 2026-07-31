package kr.co.quietpath.api.auth.service.result;

import kr.co.quietpath.api.auth.dto.OnboardingStatus;

public record AuthLoginResult(
    String accessToken,
    String refreshToken,
    OnboardingStatus onboardingStatus
) {
}
