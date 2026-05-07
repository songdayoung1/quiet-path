package kr.co.quietpath.domain.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(
    name = "refresh_tokens",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_refresh_token_hash", columnNames = {"token_hash"}),
        @UniqueConstraint(name = "uk_refresh_user_session", columnNames = {"user_id", "session_id"})
    },
    indexes = {
        @Index(name = "idx_refresh_user_expires", columnList = "user_id, expires_at"),
        @Index(name = "idx_refresh_expires", columnList = "expires_at")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshTokenSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 36)
    private String sessionId;

    @Column(nullable = false, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column
    private LocalDateTime revokedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder(access = AccessLevel.PRIVATE)
    private RefreshTokenSession(
        Long userId,
        String sessionId,
        String tokenHash,
        LocalDateTime expiresAt
    ) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public static RefreshTokenSession issue(
        Long userId,
        String sessionId,
        String tokenHash,
        LocalDateTime expiresAt
    ) {
        Objects.requireNonNull(userId, "userId는 필수입니다.");
        Objects.requireNonNull(sessionId, "sessionId는 필수입니다.");
        Objects.requireNonNull(tokenHash, "tokenHash는 필수입니다.");
        Objects.requireNonNull(expiresAt, "expiresAt은 필수입니다.");

        return RefreshTokenSession.builder()
            .userId(userId)
            .sessionId(sessionId)
            .tokenHash(tokenHash)
            .expiresAt(expiresAt)
            .build();
    }

    public void rotate(String newTokenHash, LocalDateTime newExpiresAt) {
        this.tokenHash = newTokenHash;
        this.expiresAt = newExpiresAt;
        this.revokedAt = null;
        touch();
    }

    public void revoke() {
        this.revokedAt = LocalDateTime.now();
        touch();
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired(LocalDateTime now) {
        return expiresAt.isBefore(now);
    }

    private void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
