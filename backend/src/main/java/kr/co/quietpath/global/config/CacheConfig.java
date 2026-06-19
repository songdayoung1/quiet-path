package kr.co.quietpath.global.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

import java.time.Duration;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

    public static final String CACHE_WEEKLY_TOP3 = "weekly-top3";
    public static final String CACHE_COMMENTS = "comments";
    private static final Duration WEEKLY_TOP3_TTL = Duration.ofMinutes(5);
    private static final Duration COMMENTS_TTL = Duration.ofMinutes(2);

    // 캐시별 TTL과 직렬화 방식을 한 곳에서 고정한다.
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJacksonJsonRedisSerializer jsonSerializer = redisJsonSerializer();

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer))
            .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
            CACHE_WEEKLY_TOP3, defaultConfig.entryTtl(WEEKLY_TOP3_TTL),
            CACHE_COMMENTS, defaultConfig.entryTtl(COMMENTS_TTL)
        );

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .build();
    }

    // Boot 4 / Jackson 3 환경에서 캐시 DTO 타입 정보를 함께 저장하도록 serializer를 맞춘다.
    static GenericJacksonJsonRedisSerializer redisJsonSerializer() {
        BasicPolymorphicTypeValidator typeValidator = BasicPolymorphicTypeValidator.builder()
            .allowIfSubType("kr.co.quietpath.api.")
            .allowIfSubType("java.lang.")
            .allowIfSubType("java.time.")
            .allowIfSubType("java.util.")
            .allowIfSubTypeIsArray()
            .build();

        return GenericJacksonJsonRedisSerializer.builder()
            .enableDefaultTyping(typeValidator)
            .build();
    }
}
