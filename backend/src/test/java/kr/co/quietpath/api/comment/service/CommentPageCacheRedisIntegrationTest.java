package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.user.repository.UserRepository;
import kr.co.quietpath.global.config.CacheConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.mockito.Mockito;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTimeout;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Testcontainers
@SpringJUnitConfig(CommentPageCacheRedisIntegrationTest.TestConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class CommentPageCacheRedisIntegrationTest {

    private static final int REDIS_PORT = 6379;

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7.2-alpine"))
        .withExposedPorts(REDIS_PORT);

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("test.redis.host", REDIS::getHost);
        registry.add("test.redis.port", () -> REDIS.getMappedPort(REDIS_PORT));
    }

    @org.springframework.beans.factory.annotation.Autowired
    private CommentPageCacheService commentPageCacheService;

    @org.springframework.beans.factory.annotation.Autowired
    private CommentRepository commentRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private StringRedisTemplate stringRedisTemplate;

    @org.springframework.beans.factory.annotation.Autowired
    private TransactionalEventPublisherHarness eventPublisherHarness;

    @BeforeEach
    void setUp() {
        reset(commentRepository, userRepository);
        stringRedisTemplate.getConnectionFactory()
            .getConnection()
            .serverCommands()
            .flushDb();
    }

    @Test
    @Order(1)
    void cacheableProxy_usesRedisCacheAndDeserializesResponseWithTenMinuteTtl() {
        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(10L), any()))
            .thenReturn(emptyPageWithTotal(3));

        CommentListResponse first = commentPageCacheService.getComments(10L, 0, 20);
        CommentListResponse cached = commentPageCacheService.getComments(10L, 0, 20);

        assertEquals(3L, first.getTotalElements());
        assertEquals(3L, cached.getTotalElements());
        assertNotNull(cached.getItems());
        verify(commentRepository, times(1))
            .findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(10L), any());

        String cacheKey = "comments::10:0:20:0";
        assertRedisKeyExists(cacheKey);
        assertTtlBetween(cacheKey, Duration.ofMinutes(9), CacheConfig.COMMENTS_TTL);
    }

    @Test
    @Order(2)
    void versionIncrement_switchesToNewCacheKeyAndSetsVersionTtlAtomically() {
        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(20L), any()))
            .thenReturn(emptyPageWithTotal(1), emptyPageWithTotal(2));

        CommentListResponse versionZero = commentPageCacheService.getComments(20L, 0, 20);
        String oldCacheKey = "comments::20:0:20:0";
        assertEquals(1L, versionZero.getTotalElements());
        assertRedisKeyExists(oldCacheKey);

        commentPageCacheService.evictRecord(20L);

        String versionKey = "comments:version:20";
        assertEquals("1", stringRedisTemplate.opsForValue().get(versionKey));
        assertTtlBetween(versionKey, Duration.ofHours(23), CacheConfig.COMMENT_VERSION_TTL);

        CommentListResponse versionOne = commentPageCacheService.getComments(20L, 0, 20);

        assertEquals(2L, versionOne.getTotalElements());
        verify(commentRepository, times(2))
            .findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(20L), any());
        assertRedisKeyExists(oldCacheKey);
        assertRedisKeyExists("comments::20:0:20:1");
    }

    @Test
    @Order(3)
    void malformedVersion_recoversToNewNamespaceWithoutReusingStaleVersionZeroCache() {
        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(25L), any()))
            .thenReturn(emptyPageWithTotal(1), emptyPageWithTotal(2));

        CommentListResponse versionZero = commentPageCacheService.getComments(25L, 0, 20);
        assertEquals(1L, versionZero.getTotalElements());
        assertRedisKeyExists("comments::25:0:20:0");

        String versionKey = "comments:version:25";
        stringRedisTemplate.opsForValue().set(
            versionKey,
            "invalid",
            CacheConfig.COMMENT_VERSION_TTL
        );

        CommentListResponse recovered = commentPageCacheService.getComments(25L, 0, 20);
        String recoveredVersion = stringRedisTemplate.opsForValue().get(versionKey);

        assertEquals(2L, recovered.getTotalElements());
        assertNotNull(recoveredVersion);
        assertNotEquals("0", recoveredVersion);
        assertNotEquals("invalid", recoveredVersion);
        verify(commentRepository, times(2))
            .findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(25L), any());
        assertRedisKeyExists("comments::25:0:20:0");
        assertRedisKeyExists("comments::25:0:20:" + recoveredVersion);
        assertTtlBetween(versionKey, Duration.ofHours(23), CacheConfig.COMMENT_VERSION_TTL);
    }

    @Test
    @Order(4)
    void negativeVersion_recoversBeforeIncrementWithoutReusingStaleVersionZeroCache() {
        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(26L), any()))
            .thenReturn(emptyPageWithTotal(1), emptyPageWithTotal(2), emptyPageWithTotal(3));

        CommentListResponse versionZero = commentPageCacheService.getComments(26L, 0, 20);
        assertEquals(1L, versionZero.getTotalElements());
        assertRedisKeyExists("comments::26:0:20:0");

        String versionKey = "comments:version:26";
        stringRedisTemplate.opsForValue().set(
            versionKey,
            "-1",
            CacheConfig.COMMENT_VERSION_TTL
        );

        CommentListResponse recovered = commentPageCacheService.getComments(26L, 0, 20);
        String recoveredVersion = stringRedisTemplate.opsForValue().get(versionKey);

        assertEquals(2L, recovered.getTotalElements());
        assertNotNull(recoveredVersion);
        assertTrue(Long.parseLong(recoveredVersion) > 0L);

        commentPageCacheService.evictRecord(26L);
        CommentListResponse incremented = commentPageCacheService.getComments(26L, 0, 20);

        assertEquals(3L, incremented.getTotalElements());
        verify(commentRepository, times(3))
            .findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(26L), any());
    }

    @Test
    @Order(5)
    void transactionalEvent_invalidatesOnlyAfterCommitAndSupportsMultipleRecordIds() {
        assertTrue(eventPublisherHarness.publishAndCheckBeforeCommit(Set.of(31L)));
        assertEquals("1", stringRedisTemplate.opsForValue().get("comments:version:31"));

        eventPublisherHarness.publishAndRollback(Set.of(32L));
        assertFalse(Boolean.TRUE.equals(stringRedisTemplate.hasKey("comments:version:32")));

        eventPublisherHarness.publish(Set.of(33L, 34L));
        assertEquals("1", stringRedisTemplate.opsForValue().get("comments:version:33"));
        assertEquals("1", stringRedisTemplate.opsForValue().get("comments:version:34"));
    }

    @Test
    @Order(6)
    void redisOutage_doesNotFailCacheWriteReadOrAfterCommitInvalidation() {
        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(40L), any()))
            .thenAnswer(invocation -> {
                // 캐시 조회까지는 성공시키고 원본 조회 직후 Redis를 중지해 저장 실패를 재현한다.
                REDIS.stop();
                return emptyPageWithTotal(7);
            });
        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(41L), any()))
            .thenReturn(emptyPageWithTotal(8));

        assertTimeout(Duration.ofSeconds(10), () -> {
            CommentListResponse writeFailureResponse = commentPageCacheService.getComments(40L, 0, 20);
            CommentListResponse readFailureResponse = commentPageCacheService.getComments(41L, 0, 20);

            assertEquals(7L, writeFailureResponse.getTotalElements());
            assertEquals(8L, readFailureResponse.getTotalElements());
            verify(commentRepository, times(1))
                .findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(40L), any());
            verify(commentRepository, times(1))
                .findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(eq(41L), any());
            assertDoesNotThrow(() -> eventPublisherHarness.publish(Set.of(40L)));
        });
    }

    private PageImpl<kr.co.quietpath.domain.comment.entity.Comment> emptyPageWithTotal(long total) {
        return new PageImpl<>(List.of(), PageRequest.of(0, 20), total);
    }

    private void assertRedisKeyExists(String key) {
        long deadline = System.nanoTime() + Duration.ofSeconds(1).toNanos();
        while (System.nanoTime() < deadline) {
            if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(key))) {
                return;
            }
            try {
                Thread.sleep(20L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Redis 키 확인 중 인터럽트됨", exception);
            }
        }

        assertTrue(false, () -> "Redis 키가 생성되지 않음: " + key
            + ", actualKeys=" + stringRedisTemplate.keys("*"));
    }

    private void assertTtlBetween(String key, Duration minimum, Duration maximum) {
        Long ttlSeconds = stringRedisTemplate.getExpire(key, TimeUnit.SECONDS);

        assertNotNull(ttlSeconds);
        assertTrue(ttlSeconds >= minimum.toSeconds(), "TTL이 최소값보다 짧음: " + ttlSeconds);
        assertTrue(ttlSeconds <= maximum.toSeconds(), "TTL이 최대값보다 김: " + ttlSeconds);
    }

    @org.springframework.boot.test.context.TestConfiguration(proxyBeanMethods = false)
    @EnableTransactionManagement(proxyTargetClass = true)
    @Import(CacheConfig.class)
    static class TestConfig {

        @Bean
        RedisConnectionFactory redisConnectionFactory(
            org.springframework.core.env.Environment environment
        ) {
            RedisStandaloneConfiguration standalone = new RedisStandaloneConfiguration(
                environment.getRequiredProperty("test.redis.host"),
                environment.getRequiredProperty("test.redis.port", Integer.class)
            );
            LettuceClientConfiguration client = LettuceClientConfiguration.builder()
                .commandTimeout(Duration.ofSeconds(1))
                .shutdownTimeout(Duration.ZERO)
                .build();
            return new LettuceConnectionFactory(standalone, client);
        }

        @Bean
        StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
            return new StringRedisTemplate(connectionFactory);
        }

        @Bean
        CommentRepository commentRepository() {
            return Mockito.mock(CommentRepository.class);
        }

        @Bean
        UserRepository userRepository() {
            return Mockito.mock(UserRepository.class);
        }

        @Bean
        CommentPageCacheService commentPageCacheService(
            CommentRepository commentRepository,
            UserRepository userRepository,
            StringRedisTemplate stringRedisTemplate
        ) {
            return new CommentPageCacheService(commentRepository, userRepository, stringRedisTemplate);
        }

        @Bean
        CommentCacheInvalidationEventHandler commentCacheInvalidationEventHandler(
            CommentPageCacheService commentPageCacheService
        ) {
            return new CommentCacheInvalidationEventHandler(commentPageCacheService);
        }

        @Bean
        TransactionalEventPublisherHarness transactionalEventPublisherHarness(
            ApplicationEventPublisher applicationEventPublisher,
            StringRedisTemplate stringRedisTemplate
        ) {
            return new TransactionalEventPublisherHarness(applicationEventPublisher, stringRedisTemplate);
        }

        @Bean
        PlatformTransactionManager transactionManager() {
            return new TestTransactionManager();
        }
    }

    static class TransactionalEventPublisherHarness {

        private final ApplicationEventPublisher applicationEventPublisher;
        private final StringRedisTemplate stringRedisTemplate;

        TransactionalEventPublisherHarness(
            ApplicationEventPublisher applicationEventPublisher,
            StringRedisTemplate stringRedisTemplate
        ) {
            this.applicationEventPublisher = applicationEventPublisher;
            this.stringRedisTemplate = stringRedisTemplate;
        }

        @Transactional
        public boolean publishAndCheckBeforeCommit(Set<Long> recordIds) {
            applicationEventPublisher.publishEvent(
                CommentCacheInvalidationRequestedEvent.forRecords(recordIds)
            );
            return recordIds.stream()
                .noneMatch(recordId -> Boolean.TRUE.equals(
                    stringRedisTemplate.hasKey("comments:version:" + recordId)
                ));
        }

        @Transactional
        public void publish(Set<Long> recordIds) {
            applicationEventPublisher.publishEvent(
                CommentCacheInvalidationRequestedEvent.forRecords(recordIds)
            );
        }

        @Transactional
        public void publishAndRollback(Set<Long> recordIds) {
            applicationEventPublisher.publishEvent(
                CommentCacheInvalidationRequestedEvent.forRecords(recordIds)
            );
            org.springframework.transaction.interceptor.TransactionAspectSupport
                .currentTransactionStatus()
                .setRollbackOnly();
        }
    }

    static class TestTransactionManager extends AbstractPlatformTransactionManager {

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
        }
    }
}
