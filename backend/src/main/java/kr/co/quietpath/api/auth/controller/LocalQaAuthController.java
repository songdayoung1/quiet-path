package kr.co.quietpath.api.auth.controller;

import kr.co.quietpath.api.auth.cookie.RefreshTokenCookieProvider;
import kr.co.quietpath.api.auth.dto.response.AuthCallbackResponse;
import kr.co.quietpath.api.auth.service.AuthService;
import kr.co.quietpath.api.auth.service.result.AuthLoginResult;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Profile("local")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth/local")
public class LocalQaAuthController {

    private final AuthService authService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    @PostMapping("/qa-login")
    public ResponseEntity<AuthCallbackResponse> login() {
        AuthLoginResult result = authService.loginWithLocalQaAccount();
        AuthCallbackResponse response = AuthCallbackResponse.builder()
            .token(result.accessToken())
            .onboardingStatus(result.onboardingStatus())
            .build();
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.issue(result.refreshToken()).toString())
            .body(response);
    }
}
