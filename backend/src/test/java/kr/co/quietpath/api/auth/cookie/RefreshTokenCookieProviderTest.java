package kr.co.quietpath.api.auth.cookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.RefreshTokenCookieProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RefreshTokenCookieProviderTest {

    @Test
    void issue_usesRedisTtlPolicyAndSecurityAttributes() {
        JwtProperties jwtProperties = jwtProperties(300L);
        RefreshTokenCookieProperties cookieProperties = cookieProperties(false, "Lax", 60L);
        RefreshTokenCookieProvider provider = new RefreshTokenCookieProvider(jwtProperties, cookieProperties);

        ResponseCookie cookie = provider.issue("rotated-refresh-token");

        assertEquals("refresh_token", cookie.getName());
        assertEquals("rotated-refresh-token", cookie.getValue());
        assertEquals("/api/v1/auth", cookie.getPath());
        assertEquals("Lax", cookie.getSameSite());
        assertEquals(Duration.ofSeconds(240), cookie.getMaxAge());
        assertTrue(cookie.isHttpOnly());
        assertFalse(cookie.isSecure());
    }

    @Test
    void expire_matchesIssuedCookiePolicyAndSetsZeroMaxAge() {
        RefreshTokenCookieProvider provider = new RefreshTokenCookieProvider(
            jwtProperties(300L),
            cookieProperties(true, "Strict", 60L)
        );

        ResponseCookie cookie = provider.expire();

        assertEquals("refresh_token", cookie.getName());
        assertEquals("", cookie.getValue());
        assertEquals("/api/v1/auth", cookie.getPath());
        assertEquals(Duration.ZERO, cookie.getMaxAge());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.isSecure());
    }

    @Test
    void resolveRefreshToken_readsConfiguredCookie() {
        RefreshTokenCookieProvider provider = new RefreshTokenCookieProvider(
            jwtProperties(300L),
            cookieProperties(false, "Lax", 60L)
        );
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getCookies()).thenReturn(new Cookie[]{
            new Cookie("other", "ignored"),
            new Cookie("refresh_token", "cookie-refresh-token")
        });

        assertEquals("cookie-refresh-token", provider.resolveRefreshToken(request));
    }

    @Test
    void constructor_rejectsCookieLifetimeNotShorterThanRedisTtl() {
        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            new RefreshTokenCookieProvider(
                jwtProperties(60L),
                cookieProperties(false, "Lax", 60L)
            )
        );

        assertEquals("refresh cookie Max-Age는 Redis TTL보다 짧아야 합니다.", exception.getMessage());
    }

    @Test
    void constructor_rejectsSameSiteNoneWithoutSecure() {
        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            new RefreshTokenCookieProvider(
                jwtProperties(300L),
                cookieProperties(false, "None", 60L)
            )
        );

        assertEquals("SameSite=None 쿠키는 Secure=true여야 합니다.", exception.getMessage());
    }

    private JwtProperties jwtProperties(Long refreshTtlSeconds) {
        JwtProperties properties = new JwtProperties();
        properties.setRefreshTokenTtlSeconds(refreshTtlSeconds);
        return properties;
    }

    private RefreshTokenCookieProperties cookieProperties(
        boolean secure,
        String sameSite,
        Long expirationSkewSeconds
    ) {
        RefreshTokenCookieProperties properties = new RefreshTokenCookieProperties();
        properties.setSecure(secure);
        properties.setSameSite(sameSite);
        properties.setExpirationSkewSeconds(expirationSkewSeconds);
        return properties;
    }
}
