package kr.co.quietpath.global.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;

@Slf4j
public class ResilientCacheErrorHandler implements CacheErrorHandler {

    @Override
    public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
        log.warn(
            "Cache read failed; continuing with source data: cache={}, key={}",
            cache.getName(),
            key,
            exception
        );
    }

    @Override
    public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
        log.warn(
            "Cache write failed; returning source response: cache={}, key={}",
            cache.getName(),
            key,
            exception
        );
    }

    @Override
    public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
        log.warn(
            "Cache eviction failed; stale data may remain until TTL: cache={}, key={}",
            cache.getName(),
            key,
            exception
        );
    }

    @Override
    public void handleCacheClearError(RuntimeException exception, Cache cache) {
        log.warn(
            "Cache clear failed; stale data may remain until TTL: cache={}",
            cache.getName(),
            exception
        );
    }
}
