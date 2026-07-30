package kr.co.quietpath.api.auth.controller;

import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.RefreshTokenCookieProperties;
import kr.co.quietpath.api.auth.cookie.RefreshTokenCookieProvider;
import kr.co.quietpath.api.auth.dto.OnboardingStatus;
import kr.co.quietpath.api.auth.service.AuthService;
import kr.co.quietpath.api.auth.service.result.AuthLoginResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@ExtendWith(MockitoExtension.class)
class LocalQaAuthControllerTest {

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
        mockMvc = standaloneSetup(new LocalQaAuthController(authService, cookieProvider)).build();
    }

    @Test
    void login_issuesAccessTokenAndRefreshCookie() throws Exception {
        when(authService.loginWithLocalQaAccount()).thenReturn(
            new AuthLoginResult("local-access-token", "local-refresh-token", OnboardingStatus.EXISTING)
        );

        mockMvc.perform(post("/api/v1/auth/local/qa-login"))
            .andExpect(status().isOk())
            .andExpect(header().string(
                HttpHeaders.SET_COOKIE,
                org.hamcrest.Matchers.containsString("refresh_token=local-refresh-token")
            ))
            .andExpect(header().string(
                HttpHeaders.SET_COOKIE,
                org.hamcrest.Matchers.containsString("HttpOnly")
            ))
            .andExpect(jsonPath("$.token").value("local-access-token"))
            .andExpect(jsonPath("$.onboardingStatus").value("EXISTING"))
            .andExpect(jsonPath("$.refreshToken").doesNotExist());

        verify(authService).loginWithLocalQaAccount();
    }
}
