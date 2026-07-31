package kr.co.quietpath.api.auth.controller;

import jakarta.servlet.http.Cookie;
import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.RefreshTokenCookieProperties;
import kr.co.quietpath.api.auth.cookie.RefreshTokenCookieProvider;
import kr.co.quietpath.api.auth.dto.OnboardingStatus;
import kr.co.quietpath.api.auth.dto.response.AuthLogoutResponse;
import kr.co.quietpath.api.auth.service.AuthService;
import kr.co.quietpath.api.auth.service.result.AuthLoginResult;
import kr.co.quietpath.api.auth.service.result.AuthRefreshResult;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.common.error.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setRefreshTokenTtlSeconds(300L);

        RefreshTokenCookieProperties cookieProperties = new RefreshTokenCookieProperties();
        cookieProperties.setSecure(false);
        cookieProperties.setExpirationSkewSeconds(60L);

        RefreshTokenCookieProvider cookieProvider = new RefreshTokenCookieProvider(
            jwtProperties,
            cookieProperties
        );
        mockMvc = standaloneSetup(new AuthController(authService, cookieProvider))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void callback_setsRefreshCookieAndExcludesRefreshTokenFromBody() throws Exception {
        when(authService.loginWithKakaoCode("oauth-code")).thenReturn(
            new AuthLoginResult("access-token", "refresh-token", OnboardingStatus.EXISTING)
        );

        mockMvc.perform(get("/api/v1/auth/kakao/callback").param("code", "oauth-code"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=refresh-token")))
            .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("HttpOnly")))
            .andExpect(jsonPath("$.token").value("access-token"))
            .andExpect(jsonPath("$.onboardingStatus").value("EXISTING"))
            .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    @Test
    void refresh_readsCookieRotatesItAndReturnsOnlyAccessToken() throws Exception {
        when(authService.refresh("current-refresh-token")).thenReturn(
            new AuthRefreshResult("new-access-token", "rotated-refresh-token")
        );

        mockMvc.perform(post("/api/v1/auth/refresh")
                .cookie(new Cookie("refresh_token", "current-refresh-token")))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=rotated-refresh-token")))
            .andExpect(jsonPath("$.token").value("new-access-token"))
            .andExpect(jsonPath("$.refreshToken").doesNotExist());

        verify(authService).refresh("current-refresh-token");
    }

    @Test
    void refresh_withoutCookieReturnsRefreshTokenRequired() throws Exception {
        when(authService.refresh(null)).thenThrow(new ApiException(ErrorCode.REFRESH_TOKEN_REQUIRED));

        mockMvc.perform(post("/api/v1/auth/refresh"))
            .andExpect(status().isBadRequest())
            .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=;")))
            .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("Max-Age=0")))
            .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_REQUIRED"));
    }

    @Test
    void refresh_withInvalidCookieDoesNotExpirePossiblyRotatedCookie() throws Exception {
        when(authService.refresh("invalid-refresh-token"))
            .thenThrow(new ApiException(ErrorCode.REFRESH_TOKEN_INVALID));

        mockMvc.perform(post("/api/v1/auth/refresh")
            .cookie(new Cookie("refresh_token", "invalid-refresh-token")))
            .andExpect(status().isUnauthorized())
            .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
            .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_INVALID"));
    }

    @Test
    void refresh_withNonRefreshErrorDoesNotExpireCookie() throws Exception {
        when(authService.refresh("current-refresh-token"))
            .thenThrow(new ApiException(ErrorCode.INVALID_REQUEST));

        mockMvc.perform(post("/api/v1/auth/refresh")
                .cookie(new Cookie("refresh_token", "current-refresh-token")))
            .andExpect(status().isBadRequest())
            .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void logout_deletesRedisSessionByCookieAndExpiresCookie() throws Exception {
        when(authService.logout("current-refresh-token")).thenReturn(
            AuthLogoutResponse.builder().success(true).build()
        );

        mockMvc.perform(post("/api/v1/auth/logout")
                .cookie(new Cookie("refresh_token", "current-refresh-token")))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=;")))
            .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("Max-Age=0")))
            .andExpect(jsonPath("$.success").value(true));

        verify(authService).logout("current-refresh-token");
    }
}
