package kr.co.quietpath.domain.auth.entity;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@RedisHash("refreshToken")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshTokenSession {

    @Id
    private String id;

    @Indexed
    private Long userId;

    @Indexed
    private String sessionId;

    @Indexed
    private String tokenHash;

    @TimeToLive
    private Long ttlSeconds;

    private LocalDateTime createdAt;

    private RefreshTokenSession(Long userId, String sessionId, String tokenHash, Long ttlSeconds) {
        this.id = UUID.randomUUID().toString();
        this.userId = userId;
        this.sessionId = sessionId;
        this.tokenHash = tokenHash;
        this.ttlSeconds = ttlSeconds;
        this.createdAt = LocalDateTime.now();
    }

    public static RefreshTokenSession issue(Long userId, String sessionId, String tokenHash, Long ttlSeconds) {
        Objects.requireNonNull(userId, "userId는 필수입니다.");
        Objects.requireNonNull(sessionId, "sessionId는 필수입니다.");
        Objects.requireNonNull(tokenHash, "tokenHash는 필수입니다.");
        validateTtlSeconds(ttlSeconds);
        return new RefreshTokenSession(userId, sessionId, tokenHash, ttlSeconds);
    }

    public void rotate(String newTokenHash, Long ttlSeconds) {
        Objects.requireNonNull(newTokenHash, "newTokenHash는 필수입니다.");
        validateTtlSeconds(ttlSeconds);
        this.tokenHash = newTokenHash;
        this.ttlSeconds = ttlSeconds;
    }

    private static void validateTtlSeconds(Long ttlSeconds) {
        Objects.requireNonNull(ttlSeconds, "ttlSeconds는 필수입니다.");
        if (ttlSeconds <= 0) {
            throw new IllegalArgumentException("ttlSeconds는 0보다 커야 합니다.");
        }
    }
}
