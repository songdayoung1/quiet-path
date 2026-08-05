package kr.co.quietpath.api.auth.controller;

import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.auth.cookie.RefreshTokenCookieProvider;
import kr.co.quietpath.api.auth.dto.response.AuthWithdrawalResponse;
import kr.co.quietpath.api.auth.service.AccountWithdrawalService;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth/me")
public class AccountWithdrawalController {

    private final AccountWithdrawalService accountWithdrawalService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    @DeleteMapping
    public ResponseEntity<AuthWithdrawalResponse> withdraw(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = extractUserId(principal);
        accountWithdrawalService.withdraw(userId);

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.expire().toString())
            .body(AuthWithdrawalResponse.builder().success(true).build());
    }

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.AUTH_REQUIRED);
        }
        return principal.getUserId();
    }
}
