package kr.co.quietpath.api.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.auth.cookie.RefreshTokenCookieProvider;
import kr.co.quietpath.api.auth.dto.request.AuthNicknameUpdateRequest;
import kr.co.quietpath.api.auth.dto.response.AuthCallbackResponse;
import kr.co.quietpath.api.auth.dto.response.AuthLogoutResponse;
import kr.co.quietpath.api.auth.dto.response.AuthMeResponse;
import kr.co.quietpath.api.auth.dto.response.AuthRefreshResponse;
import kr.co.quietpath.api.auth.dto.response.AuthStartResponse;
import kr.co.quietpath.api.auth.service.AuthService;
import kr.co.quietpath.api.auth.service.result.AuthLoginResult;
import kr.co.quietpath.api.auth.service.result.AuthRefreshResult;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import java.net.URI;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    @GetMapping("/kakao/start")
    public ResponseEntity<Void> startKakaoLogin() {
        String redirectUrl = authService.buildKakaoAuthorizeUrl();
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(redirectUrl))
            .build();
    }

    @GetMapping("/kakao/start-url")
    public AuthStartResponse getKakaoStartUrl() {
        return AuthStartResponse.builder()
            .redirectUrl(authService.buildKakaoAuthorizeUrl())
            .build();
    }

    @GetMapping("/kakao/callback")
    public ResponseEntity<AuthCallbackResponse> handleKakaoCallback(
        @RequestParam("code") String code
    ) {
        AuthLoginResult result = authService.loginWithKakaoCode(code);
        AuthCallbackResponse response = AuthCallbackResponse.builder()
            .token(result.accessToken())
            .onboardingStatus(result.onboardingStatus())
            .build();
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.issue(result.refreshToken()).toString())
            .body(response);
    }

    @GetMapping("/me")
    public AuthMeResponse getMe(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return authService.getMe(extractUserId(principal));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthRefreshResponse> refresh(
        HttpServletRequest request,
        HttpServletResponse servletResponse
    ) {
        String refreshToken = refreshTokenCookieProvider.resolveRefreshToken(request);
        try {
            AuthRefreshResult result = authService.refresh(refreshToken);
            AuthRefreshResponse response = AuthRefreshResponse.builder()
                .token(result.accessToken())
                .build();
            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.issue(result.refreshToken()).toString())
                .body(response);
        } catch (ApiException exception) {
            if (shouldExpireRefreshCookie(exception)) {
                servletResponse.addHeader(
                    HttpHeaders.SET_COOKIE,
                    refreshTokenCookieProvider.expire().toString()
                );
            }
            throw exception;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthLogoutResponse> logout(
        HttpServletRequest request
    ) {
        String refreshToken = refreshTokenCookieProvider.resolveRefreshToken(request);
        AuthLogoutResponse response = authService.logout(refreshToken);
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.expire().toString())
            .body(response);
    }

    @PatchMapping("/me/nickname")
    public AuthMeResponse updateNickname(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody AuthNicknameUpdateRequest request
    ) {
        Long userId = extractUserId(principal);
        return authService.updateNickname(userId, request.getNickname());
    }

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.AUTH_REQUIRED);
        }
        return principal.getUserId();
    }

    private boolean shouldExpireRefreshCookie(ApiException exception) {
        return exception.getErrorCode() == ErrorCode.REFRESH_TOKEN_REQUIRED
            || exception.getErrorCode() == ErrorCode.REFRESH_TOKEN_INVALID;
    }
}
