package kr.co.quietpath.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Entity
@Table(name = "web_push_subscriptions", indexes = {
    @Index(name = "idx_web_push_subscriptions_user", columnList = "user_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WebPushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 2048)
    private String endpoint;

    @Column(nullable = false, length = 64, unique = true)
    private String endpointHash;

    @Column(nullable = false, length = 255)
    private String p256dhKey;

    @Column(nullable = false, length = 255)
    private String authKey;

    @Column(length = 500)
    private String userAgent;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private WebPushSubscription(
        Long userId,
        String endpoint,
        String p256dhKey,
        String authKey,
        String userAgent
    ) {
        this.userId = userId;
        this.endpoint = endpoint;
        this.endpointHash = hashEndpoint(endpoint);
        this.p256dhKey = p256dhKey;
        this.authKey = authKey;
        this.userAgent = userAgent;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public static WebPushSubscription create(
        Long userId,
        String endpoint,
        String p256dhKey,
        String authKey,
        String userAgent
    ) {
        return new WebPushSubscription(userId, endpoint, p256dhKey, authKey, userAgent);
    }

    public void replaceOwnerAndKeys(Long userId, String p256dhKey, String authKey, String userAgent) {
        this.userId = userId;
        this.p256dhKey = p256dhKey;
        this.authKey = authKey;
        this.userAgent = userAgent;
        this.updatedAt = LocalDateTime.now();
    }

    public static String hashEndpoint(String endpoint) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(endpoint.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", exception);
        }
    }
}
