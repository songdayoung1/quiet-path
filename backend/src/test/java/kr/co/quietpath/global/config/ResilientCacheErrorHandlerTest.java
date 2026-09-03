package kr.co.quietpath.global.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResilientCacheErrorHandlerTest {

    @Mock
    private Cache cache;

    private final ResilientCacheErrorHandler errorHandler = new ResilientCacheErrorHandler();

    @Test
    void redisCacheErrors_areLoggedWithoutPropagation() {
        when(cache.getName()).thenReturn("comments");
        RuntimeException failure = new IllegalStateException("redis unavailable");

        assertDoesNotThrow(() -> errorHandler.handleCacheGetError(failure, cache, "key"));
        assertDoesNotThrow(() -> errorHandler.handleCachePutError(failure, cache, "key", "value"));
        assertDoesNotThrow(() -> errorHandler.handleCacheEvictError(failure, cache, "key"));
        assertDoesNotThrow(() -> errorHandler.handleCacheClearError(failure, cache));
    }
}
