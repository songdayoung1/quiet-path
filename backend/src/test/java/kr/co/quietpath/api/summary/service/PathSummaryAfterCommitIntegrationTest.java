package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.QuietPathApplication;
import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
@SpringBootTest(
    classes = QuietPathApplication.class,
    properties = {
        "spring.jpa.hibernate.ddl-auto=create-only",
        "spring.jpa.open-in-view=false",
        "spring.datasource.hikari.maximum-pool-size=5",
        "spring.datasource.hikari.minimum-idle=1",
        "app.jwt.secret=abcdefghijklmnopqrstuvwxyz123456",
        "openai.api-key=test-key",
        "openai.model=test-model",
        "openai.summary-prompt-version=test-v1"
    }
)
@Import(PathSummaryAfterCommitIntegrationTest.TestConfig.class)
class PathSummaryAfterCommitIntegrationTest {

    private static final int MYSQL_PORT = 3306;
    private static final Duration ASYNC_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration NO_INVOCATION_WINDOW = Duration.ofMillis(500);

    @Container
    static final GenericContainer<?> MYSQL = new GenericContainer<>(DockerImageName.parse("mysql:8.0"))
        .withEnv("MYSQL_DATABASE", "quietpath_test")
        .withEnv("MYSQL_USER", "quietpath")
        .withEnv("MYSQL_PASSWORD", "quietpath")
        .withEnv("MYSQL_ROOT_PASSWORD", "root")
        .withExposedPorts(MYSQL_PORT)
        .waitingFor(Wait.forLogMessage(".*ready for connections.*\\n", 2))
        .withStartupTimeout(Duration.ofMinutes(2));

    @DynamicPropertySource
    static void mysqlProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> String.format(
            "jdbc:mysql://%s:%d/quietpath_test?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul&useUnicode=true&connectionCollation=utf8mb4_unicode_ci",
            MYSQL.getHost(),
            MYSQL.getMappedPort(MYSQL_PORT)
        ));
        registry.add("spring.datasource.username", () -> "quietpath");
        registry.add("spring.datasource.password", () -> "quietpath");
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
    }

    @Autowired
    private PathSummaryCommandService pathSummaryCommandService;

    @Autowired
    private PathSummaryRepository pathSummaryRepository;

    @Autowired
    private PathRepository pathRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private ControlledAiSummaryClient aiSummaryClient;

    @Autowired
    @Qualifier("instrumentedPathSummaryGenerationService")
    private InstrumentedPathSummaryGenerationService generationService;

    private TransactionTemplate transactionTemplate;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        aiSummaryClient.reset(false);
        generationService.reset();
        transactionTemplate.executeWithoutResult(status -> {
            pathSummaryRepository.deleteAllInBatch();
            recordRepository.deleteAllInBatch();
            pathRepository.deleteAllInBatch();
            userRepository.deleteAllInBatch();
        });
    }

    @AfterEach
    void tearDown() {
        aiSummaryClient.release();
    }

    @Test
    void committedRequest_runsWorkerAfterCommit_once_andUsesCommittedData() throws Exception {
        Fixture fixture = createCommittedFixture();
        AtomicReference<Long> summaryId = new AtomicReference<>();
        String requestThread = Thread.currentThread().getName();

        transactionTemplate.executeWithoutResult(status -> {
            pathSummaryCommandService.requestSummary(fixture.userId(), fixture.pathId());

            PathSummary pending = findLatestSummary(fixture.pathId());
            summaryId.set(pending.getId());

            assertEquals("PENDING", pending.getStatus());
            assertFalse(
                generationService.awaitWorker(NO_INVOCATION_WINDOW),
                "요청 트랜잭션이 진행 중인데 Worker가 실행됨"
            );
        });

        assertTrue(generationService.awaitWorker(ASYNC_TIMEOUT), "COMMIT 후 Worker가 실행되지 않음");
        assertTrue(aiSummaryClient.awaitInvocation(ASYNC_TIMEOUT), "Worker가 커밋된 데이터를 조회해 AI 요청을 시작하지 못함");

        PathSummary processing = pathSummaryRepository.findById(summaryId.get()).orElseThrow();
        assertEquals("PROCESSING", processing.getStatus());
        assertEquals(1, generationService.invocationCount());
        assertEquals(1, aiSummaryClient.invocationCount());
        assertNotEquals(requestThread, generationService.workerThreads().peek());
        assertTrue(generationService.workerThreads().peek().startsWith("path-summary-"));

        AiSummaryRequest request = aiSummaryClient.requests().peek();
        assertNotNull(request);
        assertEquals("테스트 방향", request.getDirectionName());
        assertEquals("꾸준히 기록하기", request.getDirectionText());
        assertEquals(1, request.getRecords().size());
        assertEquals("오늘의 장면", request.getRecords().getFirst().getSceneText());

        aiSummaryClient.release();

        PathSummary done = awaitStatus(summaryId.get(), "DONE");
        assertNotNull(done.getContent());
        assertFalse(
            generationService.awaitSecondInvocation(NO_INVOCATION_WINDOW),
            "이벤트 한 건에서 Worker가 중복 실행됨"
        );
        assertEquals(1, generationService.invocationCount());
        assertEquals(1, aiSummaryClient.invocationCount());
    }

    @Test
    void rolledBackRequest_doesNotRunWorker_andDoesNotPersistPendingRow() {
        Fixture fixture = createCommittedFixture();
        AtomicReference<Long> rolledBackSummaryId = new AtomicReference<>();

        transactionTemplate.executeWithoutResult(status -> {
            pathSummaryCommandService.requestSummary(fixture.userId(), fixture.pathId());

            PathSummary pending = findLatestSummary(fixture.pathId());
            rolledBackSummaryId.set(pending.getId());

            assertEquals("PENDING", pending.getStatus());
            assertFalse(
                generationService.awaitWorker(NO_INVOCATION_WINDOW),
                "ROLLBACK 전 Worker가 실행됨"
            );
            status.setRollbackOnly();
        });

        assertFalse(
            generationService.awaitWorker(NO_INVOCATION_WINDOW),
            "ROLLBACK된 요청에서 Worker가 실행됨"
        );
        assertEquals(0, generationService.invocationCount());
        assertEquals(0, aiSummaryClient.invocationCount());
        assertFalse(pathSummaryRepository.existsById(rolledBackSummaryId.get()));
        assertTrue(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(fixture.pathId()).isEmpty());
    }

    @Test
    void committedEventForMissingRow_runsWorkerButSkipsAiCall() throws Exception {
        long missingSummaryId = Long.MAX_VALUE;

        transactionTemplate.executeWithoutResult(status ->
            applicationEventPublisher.publishEvent(new PathSummaryRequestedEvent(missingSummaryId))
        );

        assertTrue(generationService.awaitWorker(ASYNC_TIMEOUT), "COMMIT된 이벤트가 Worker에 전달되지 않음");
        assertEquals(1, generationService.invocationCount());
        assertEquals(List.of(missingSummaryId), generationService.summaryIds().stream().toList());
        assertFalse(
            aiSummaryClient.awaitInvocation(NO_INVOCATION_WINDOW),
            "존재하지 않는 summary에 대해 AI가 호출됨"
        );
        assertEquals(0, aiSummaryClient.invocationCount());
        assertFalse(generationService.awaitSecondInvocation(NO_INVOCATION_WINDOW));
    }

    @Test
    void aiFailure_keepsCommittedRow_andMarksItFailed() throws Exception {
        Fixture fixture = createCommittedFixture();
        aiSummaryClient.reset(true);
        AtomicReference<Long> summaryId = new AtomicReference<>();

        transactionTemplate.executeWithoutResult(status -> {
            pathSummaryCommandService.requestSummary(fixture.userId(), fixture.pathId());
            summaryId.set(findLatestSummary(fixture.pathId()).getId());
        });

        assertTrue(generationService.awaitWorker(ASYNC_TIMEOUT));
        assertTrue(aiSummaryClient.awaitInvocation(ASYNC_TIMEOUT));
        aiSummaryClient.release();

        PathSummary failed = awaitStatus(summaryId.get(), "FAILED");
        assertEquals(summaryId.get(), failed.getId());
        assertNull(failed.getContent());
        assertEquals(1, pathSummaryRepository.count());
        assertEquals(1, generationService.invocationCount());
        assertEquals(1, aiSummaryClient.invocationCount());
    }

    private Fixture createCommittedFixture() {
        return transactionTemplate.execute(status -> {
            String unique = Long.toUnsignedString(System.nanoTime());
            User user = userRepository.save(User.createLocal("summary-provider-" + unique, "summary-user-" + unique));

            Path path = pathRepository.save(Path.builder()
                .userId(user.getId())
                .categoryCode("GROWTH")
                .directionName("테스트 방향")
                .directionText("꾸준히 기록하기")
                .reviewAt(LocalDateTime.now().minusDays(1))
                .build());
            path.complete();

            recordRepository.save(Record.builder()
                .user(user)
                .path(path)
                .categoryCode("GROWTH")
                .recordDate(LocalDate.now().minusDays(2))
                .sceneText("오늘의 장면")
                .oneWordText("꾸준함")
                .tomorrowText("한 번 더 기록하기")
                .moodCode("CALM")
                .build());

            return new Fixture(user.getId(), path.getId());
        });
    }

    private PathSummary findLatestSummary(Long pathId) {
        return pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(pathId).orElseThrow();
    }

    private PathSummary awaitStatus(Long summaryId, String expectedStatus) throws Exception {
        long deadline = System.nanoTime() + ASYNC_TIMEOUT.toNanos();
        PathSummary latest = null;

        while (System.nanoTime() < deadline) {
            latest = pathSummaryRepository.findById(summaryId).orElse(null);
            if (latest != null && expectedStatus.equals(latest.getStatus())) {
                return latest;
            }
            TimeUnit.MILLISECONDS.sleep(25);
        }

        String actualStatus = latest == null ? "MISSING" : latest.getStatus();
        throw new AssertionError("summary 상태 전이 시간 초과. expected=" + expectedStatus + ", actual=" + actualStatus);
    }

    private record Fixture(Long userId, Long pathId) {
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestConfig {

        @Bean
        @Primary
        ControlledAiSummaryClient controlledAiSummaryClient() {
            return new ControlledAiSummaryClient();
        }

        @Bean("instrumentedPathSummaryGenerationService")
        @Primary
        InstrumentedPathSummaryGenerationService instrumentedPathSummaryGenerationService(
            ControlledAiSummaryClient aiSummaryClient,
            PathSummaryStateService pathSummaryStateService
        ) {
            return new InstrumentedPathSummaryGenerationService(aiSummaryClient, pathSummaryStateService);
        }
    }

    static final class InstrumentedPathSummaryGenerationService extends PathSummaryGenerationService {

        private final AtomicInteger invocations = new AtomicInteger();
        private final Queue<Long> summaryIds = new ConcurrentLinkedQueue<>();
        private final Queue<String> workerThreads = new ConcurrentLinkedQueue<>();
        private final AtomicReference<CountDownLatch> workerEntered = new AtomicReference<>(new CountDownLatch(1));
        private final AtomicReference<CountDownLatch> secondInvocation = new AtomicReference<>(new CountDownLatch(1));

        InstrumentedPathSummaryGenerationService(
            AiSummaryClient aiSummaryClient,
            PathSummaryStateService pathSummaryStateService
        ) {
            super(aiSummaryClient, pathSummaryStateService);
        }

        @Override
        public void generateSummary(Long summaryId) {
            int invocation = invocations.incrementAndGet();
            summaryIds.add(summaryId);
            workerThreads.add(Thread.currentThread().getName());
            workerEntered.get().countDown();
            if (invocation > 1) {
                secondInvocation.get().countDown();
            }
            super.generateSummary(summaryId);
        }

        void reset() {
            invocations.set(0);
            summaryIds.clear();
            workerThreads.clear();
            workerEntered.set(new CountDownLatch(1));
            secondInvocation.set(new CountDownLatch(1));
        }

        boolean awaitWorker(Duration timeout) {
            return await(workerEntered.get(), timeout);
        }

        boolean awaitSecondInvocation(Duration timeout) {
            return await(secondInvocation.get(), timeout);
        }

        int invocationCount() {
            return invocations.get();
        }

        Queue<Long> summaryIds() {
            return summaryIds;
        }

        Queue<String> workerThreads() {
            return workerThreads;
        }
    }

    static final class ControlledAiSummaryClient implements AiSummaryClient {

        private final AtomicInteger invocations = new AtomicInteger();
        private final Queue<AiSummaryRequest> requests = new ConcurrentLinkedQueue<>();
        private final AtomicReference<CountDownLatch> invocationEntered = new AtomicReference<>(new CountDownLatch(1));
        private final AtomicReference<CountDownLatch> releaseInvocation = new AtomicReference<>(new CountDownLatch(1));
        private final AtomicBoolean fail = new AtomicBoolean();

        @Override
        public void ensureConfigured() {
            // 실제 OpenAI 설정과 네트워크 호출 없이 요청 흐름만 검증한다.
        }

        @Override
        public PathSummaryPayload summarize(AiSummaryRequest request) {
            invocations.incrementAndGet();
            requests.add(request);
            invocationEntered.get().countDown();

            if (!await(releaseInvocation.get(), ASYNC_TIMEOUT)) {
                throw new IllegalStateException("가짜 AI 대기 해제 시간 초과");
            }
            if (fail.get()) {
                throw new IllegalStateException("가짜 AI 실패");
            }
            return successfulPayload();
        }

        void reset(boolean shouldFail) {
            release();
            invocations.set(0);
            requests.clear();
            invocationEntered.set(new CountDownLatch(1));
            releaseInvocation.set(new CountDownLatch(1));
            fail.set(shouldFail);
        }

        boolean awaitInvocation(Duration timeout) {
            return await(invocationEntered.get(), timeout);
        }

        void release() {
            releaseInvocation.get().countDown();
        }

        int invocationCount() {
            return invocations.get();
        }

        Queue<AiSummaryRequest> requests() {
            return requests;
        }

        private PathSummaryPayload successfulPayload() {
            PathSummaryPayload payload = new PathSummaryPayload();
            payload.setHeadline("테스트 요약");
            payload.setBody("커밋된 기록으로 생성한 테스트 본문입니다.");
            payload.setPerspective("통합 테스트 관점");
            payload.setObservations(List.of("커밋 이후 실행"));
            payload.setImprovements(List.of("중복 실행 방지"));
            payload.setSuggestions(List.of("상태 전이 확인"));
            payload.setClosing("테스트 완료");
            return payload;
        }
    }

    private static boolean await(CountDownLatch latch, Duration timeout) {
        try {
            return latch.await(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AssertionError("비동기 테스트 대기 중 인터럽트됨", ex);
        }
    }
}
