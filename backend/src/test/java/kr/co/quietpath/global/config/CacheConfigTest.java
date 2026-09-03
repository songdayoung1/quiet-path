package kr.co.quietpath.global.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CacheConfigTest {

    @Test
    void commentCacheTtl_expiresBeforeVersionNamespace() {
        assertEquals(Duration.ofMinutes(10), CacheConfig.COMMENTS_TTL);
        assertEquals(Duration.ofHours(24), CacheConfig.COMMENT_VERSION_TTL);
        assertTrue(CacheConfig.COMMENT_VERSION_TTL.compareTo(CacheConfig.COMMENTS_TTL) > 0);
    }
}
