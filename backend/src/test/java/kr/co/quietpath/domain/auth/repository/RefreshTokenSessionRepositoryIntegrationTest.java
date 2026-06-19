package kr.co.quietpath.domain.auth.repository;

import kr.co.quietpath.domain.auth.entity.RefreshTokenSession;
import kr.co.quietpath.QuietPathApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(
    classes = QuietPathApplication.class,
    properties = {
        "spring.datasource.url=jdbc:mysql://localhost:3306/quietpath?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul&useUnicode=true&connectionCollation=utf8mb4_unicode_ci",
        "spring.datasource.username=quietpath",
        "spring.datasource.password=quietpath",
        "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
        "spring.jpa.hibernate.ddl-auto=update",
        "spring.data.redis.host=localhost",
        "spring.data.redis.port=6379",
        "app.jwt.secret=abcdefghijklmnopqrstuvwxyz123456"
    }
)
class RefreshTokenSessionRepositoryIntegrationTest {

    @Autowired
    private RefreshTokenSessionRepository refreshTokenSessionRepository;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @AfterEach
    void tearDown() {
        refreshTokenSessionRepository.deleteAll();
        deleteByPattern("refreshToken*");
        deleteByPattern("idx:refreshToken*");
    }

    @Test
    void indexedQueries_findByTokenHashAndSessionId() {
        RefreshTokenSession session = refreshTokenSessionRepository.save(
            RefreshTokenSession.issue(1L, "session-1", "hashed-token", 60L)
        );

        var byTokenHash = refreshTokenSessionRepository.findByTokenHash("hashed-token");
        var bySession = refreshTokenSessionRepository.findByUserIdAndSessionId(1L, "session-1");

        assertTrue(byTokenHash.isPresent());
        assertTrue(bySession.isPresent());
        assertEquals(session.getId(), byTokenHash.get().getId());
        assertEquals(session.getId(), bySession.get().getId());
    }

    @Test
    void ttlExpiration_removesSession() throws InterruptedException {
        RefreshTokenSession session = refreshTokenSessionRepository.save(
            RefreshTokenSession.issue(1L, "session-1", "hashed-token", 1L)
        );

        Thread.sleep(Duration.ofSeconds(2).toMillis());

        assertTrue(refreshTokenSessionRepository.findById(session.getId()).isEmpty());
        assertTrue(refreshTokenSessionRepository.findByTokenHash("hashed-token").isEmpty());
    }

    private void deleteByPattern(String pattern) {
        Set<String> keys = stringRedisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            stringRedisTemplate.delete(keys);
        }
    }
}
