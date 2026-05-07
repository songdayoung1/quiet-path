package kr.co.quietpath.api.auth.controller;

import jakarta.validation.Valid;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.auth.dto.request.AuthNicknameUpdateRequest;
import kr.co.quietpath.api.auth.dto.request.AuthRefreshRequest;
import kr.co.quietpath.api.auth.dto.response.AuthCallbackResponse;
import kr.co.quietpath.api.auth.dto.response.AuthLogoutResponse;
import kr.co.quietpath.api.auth.dto.response.AuthMeResponse;
import kr.co.quietpath.api.auth.dto.response.AuthRefreshResponse;
import kr.co.quietpath.api.auth.service.AuthService;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/kakao/start")
    public ResponseEntity<Void> startKakaoLogin() {
        String redirectUrl = authService.buildKakaoAuthorizeUrl();
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(redirectUrl))
            .build();
    }

    @GetMapping("/kakao/callback")
    public AuthCallbackResponse handleKakaoCallback(
        @RequestParam("code") String code
    ) {
        return authService.loginWithKakaoCode(code);
    }

    @GetMapping("/me")
    public AuthMeResponse getMe(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return authService.getMe(extractUserId(principal));
    }

    @PostMapping("/refresh")
    public AuthRefreshResponse refresh(
        @Valid @RequestBody AuthRefreshRequest request
    ) {
        return authService.refresh(request.getRefreshToken());
    }

    @PostMapping("/logout")
    public AuthLogoutResponse logout(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return authService.logout(extractUserId(principal), principal.getSessionId());
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
}
