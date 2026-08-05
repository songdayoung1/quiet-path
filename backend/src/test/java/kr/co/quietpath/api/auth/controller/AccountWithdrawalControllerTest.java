package kr.co.quietpath.api.auth.controller;

import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.RefreshTokenCookieProperties;
import kr.co.quietpath.api.auth.cookie.RefreshTokenCookieProvider;
import kr.co.quietpath.api.auth.dto.response.AuthWithdrawalResponse;
import kr.co.quietpath.api.auth.service.AccountWithdrawalService;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AccountWithdrawalControllerTest {

    @Mock
    private AccountWithdrawalService accountWithdrawalService;

    private AccountWithdrawalController controller;

    @BeforeEach
    void setUp() {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setRefreshTokenTtlSeconds(300L);
        RefreshTokenCookieProperties cookieProperties = new RefreshTokenCookieProperties();
        cookieProperties.setSecure(false);
        cookieProperties.setExpirationSkewSeconds(60L);
        controller = new AccountWithdrawalController(
            accountWithdrawalService,
            new RefreshTokenCookieProvider(jwtProperties, cookieProperties)
        );
    }

    @Test
    void withdraw_deletesAccountAndExpiresRefreshCookie() {
        ResponseEntity<AuthWithdrawalResponse> response = controller.withdraw(new UserPrincipal(1L));

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertTrue(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE).contains("Max-Age=0"));
        verify(accountWithdrawalService).withdraw(1L);
    }

    @Test
    void withdraw_withoutPrincipal_returnsAuthRequired() {
        ApiException exception = assertThrows(ApiException.class, () -> controller.withdraw(null));

        assertEquals(ErrorCode.AUTH_REQUIRED, exception.getErrorCode());
    }
}
