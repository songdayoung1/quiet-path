package kr.co.quietpath.api.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private static final String SESSION_ID_CLAIM = "sid";
    private final JwtProperties jwtProperties;
    private SecretKey signingKey;

    @PostConstruct
    void initialize() {
        if (!StringUtils.hasText(jwtProperties.getSecret())) {
            throw new ApiException(ErrorCode.AUTH_CONFIG_MISSING);
        }

        byte[] secretBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new ApiException(ErrorCode.AUTH_CONFIG_MISSING);
        }
        this.signingKey = Keys.hmacShaKeyFor(secretBytes);
    }

    public String createAccessToken(Long userId, String sessionId) {
        long nowMillis = System.currentTimeMillis();
        Date issuedAt = new Date(nowMillis);
        Date expiresAt = new Date(nowMillis + (jwtProperties.getAccessTokenTtlSeconds() * 1000));

        return Jwts.builder()
            .subject(String.valueOf(userId))
            .claim(SESSION_ID_CLAIM, sessionId)
            .issuer(jwtProperties.getIssuer())
            .issuedAt(issuedAt)
            .expiration(expiresAt)
            .signWith(signingKey)
            .compact();
    }

    public Long parseUserId(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();

        return Long.parseLong(claims.getSubject());
    }

    public boolean validate(String token) {
        try {
            parseUserId(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public String parseSessionId(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return claims.get(SESSION_ID_CLAIM, String.class);
    }
}
