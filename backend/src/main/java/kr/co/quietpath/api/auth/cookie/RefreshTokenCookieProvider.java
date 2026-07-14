package kr.co.quietpath.api.auth.cookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.RefreshTokenCookieProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

import java.time.Duration;
import java.util.Locale;
import java.util.Set;

@Component
public class RefreshTokenCookieProvider {

    private static final Set<String> ALLOWED_SAME_SITE_VALUES = Set.of("Strict", "Lax", "None");

    private final JwtProperties jwtProperties;
    private final RefreshTokenCookieProperties cookieProperties;
    private final Duration cookieMaxAge;

    public RefreshTokenCookieProvider(
        JwtProperties jwtProperties,
        RefreshTokenCookieProperties cookieProperties
    ) {
        this.jwtProperties = jwtProperties;
        this.cookieProperties = cookieProperties;
        validatePolicy();
        this.cookieMaxAge = Duration.ofSeconds(
            jwtProperties.getRefreshTokenTtlSeconds() - cookieProperties.getExpirationSkewSeconds()
        );
    }

    public ResponseCookie issue(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            throw new IllegalArgumentException("refreshToken은 필수입니다.");
        }
        return baseCookie(refreshToken)
            .maxAge(cookieMaxAge)
            .build();
    }

    public ResponseCookie expire() {
        return baseCookie("")
            .maxAge(Duration.ZERO)
            .build();
    }

    public String cookieName() {
        return cookieProperties.getName();
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, cookieProperties.getName());
        return cookie == null ? null : cookie.getValue();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(cookieProperties.getName(), value)
            .httpOnly(true)
            .secure(cookieProperties.isSecure())
            .sameSite(normalizeSameSite(cookieProperties.getSameSite()))
            .path(cookieProperties.getPath());
    }

    private void validatePolicy() {
        Long refreshTtlSeconds = jwtProperties.getRefreshTokenTtlSeconds();
        Long expirationSkewSeconds = cookieProperties.getExpirationSkewSeconds();
        if (refreshTtlSeconds == null || refreshTtlSeconds <= 0) {
            throw new IllegalStateException("app.jwt.refresh-token-ttl-seconds는 0보다 커야 합니다.");
        }
        if (expirationSkewSeconds == null || expirationSkewSeconds < 0) {
            throw new IllegalStateException("refresh cookie 만료 보정값은 0 이상이어야 합니다.");
        }
        if (refreshTtlSeconds <= expirationSkewSeconds) {
            throw new IllegalStateException("refresh cookie Max-Age는 Redis TTL보다 짧아야 합니다.");
        }
        if (!cookieProperties.getPath().startsWith("/")) {
            throw new IllegalStateException("refresh cookie path는 '/'로 시작해야 합니다.");
        }

        String sameSite = normalizeSameSite(cookieProperties.getSameSite());
        if (!ALLOWED_SAME_SITE_VALUES.contains(sameSite)) {
            throw new IllegalStateException("refresh cookie SameSite는 Strict, Lax, None 중 하나여야 합니다.");
        }
        if ("None".equals(sameSite) && !cookieProperties.isSecure()) {
            throw new IllegalStateException("SameSite=None 쿠키는 Secure=true여야 합니다.");
        }
    }

    private String normalizeSameSite(String sameSite) {
        if (!StringUtils.hasText(sameSite)) {
            return sameSite;
        }
        String lowerCase = sameSite.trim().toLowerCase(Locale.ROOT);
        return Character.toUpperCase(lowerCase.charAt(0)) + lowerCase.substring(1);
    }
}
