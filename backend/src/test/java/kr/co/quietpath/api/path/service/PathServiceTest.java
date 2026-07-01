package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.request.PathCreateRequest;
import kr.co.quietpath.api.path.dto.response.PathDetailResponse;
import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PathServiceTest {

    @Mock
    private PathRepository pathRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private PathSummaryRepository pathSummaryRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private PathService pathService;

    @Test
    void createPath_activeExists_returns409() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        Path activePath = buildPath(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(activePath));

        PathCreateRequest request = new PathCreateRequest();
        request.setDirectionName("질문");
        request.setCategoryCode("study");
        request.setDirectionText("설명");
        request.setReviewAt(LocalDate.now().plusDays(7));

        ApiException ex = assertThrows(ApiException.class, () -> pathService.createPath(1L, request));
        assertEquals(ErrorCode.PATH_ALREADY_ACTIVE, ex.getErrorCode());
    }

    @Test
    void finishPath_otherPathId_returns403() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        Path activePath = buildPath(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(activePath));

        ApiException ex = assertThrows(ApiException.class, () -> pathService.finishPath(1L, 2L));
        assertEquals(ErrorCode.NOT_OWNER, ex.getErrorCode());
    }

    @Test
    void finishPath_notActive_returns409() {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        Path finishedPath = buildPath(1L);
        finishedPath.complete();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(finishedPath));

        ApiException ex = assertThrows(ApiException.class, () -> pathService.finishPath(1L, 1L));
        assertEquals(ErrorCode.PATH_NOT_ACTIVE, ex.getErrorCode());
    }

    @Test
    void createPath_reviewAtSameDay_returns400() {
        User user = User.createGoogle("provider", "user@example.com", "nick");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.empty());

        PathCreateRequest request = new PathCreateRequest();
        request.setDirectionName("질문");
        request.setCategoryCode("study");
        request.setDirectionText("설명");
        request.setReviewAt(LocalDate.now());

        ApiException ex = assertThrows(ApiException.class, () -> pathService.createPath(1L, request));
        assertEquals(ErrorCode.INVALID_PERIOD, ex.getErrorCode());
    }

    @Test
    void createPath_storesRequestedCategoryCode() {
        User user = User.createGoogle("provider", "user@example.com", "nick");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.empty());

        PathCreateRequest request = new PathCreateRequest();
        request.setDirectionName("취업 준비");
        request.setCategoryCode("job");
        request.setDirectionText("지원 흐름을 만들고 있는가?");
        request.setReviewAt(LocalDate.now().plusDays(7));

        var response = pathService.createPath(1L, request);

        verify(pathRepository).saveAndFlush(any(Path.class));
        assertEquals("job", response.getCategoryCode());
    }

    @Test
    void createPath_invalidCategoryCode_returns400() {
        User user = User.createGoogle("provider", "user@example.com", "nick");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pathRepository.findByUserIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.empty());

        PathCreateRequest request = new PathCreateRequest();
        request.setDirectionName("방향");
        request.setCategoryCode("invalid");
        request.setDirectionText("설명");
        request.setReviewAt(LocalDate.now().plusDays(7));

        ApiException ex = assertThrows(ApiException.class, () -> pathService.createPath(1L, request));
        assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
    }

    @Test
    void getPathDetail_summaryExistsBeforeReviewAt_returnsLocked() {
        Path path = buildFutureReviewPath(1L);
        PathSummary summary = PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-test")
            .inputHash("hash")
            .build();
        summary.complete("요약");

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        lenient().when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.of(summary));
        when(recordRepository.findAllByPath_IdAndIsHiddenFalseOrderByRecordDateAsc(1L)).thenReturn(List.of());

        PathDetailResponse response = pathService.getPathDetail(1L, 1L);

        assertEquals("LOCKED", response.getSummaryStatus());
        assertNull(response.getSummary());
    }

    @Test
    void getPathDetail_afterReviewAt_withoutRecords_returnsEmpty() {
        Path path = buildPastReviewCompletedPath(1L);

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(recordRepository.findAllByPath_IdAndIsHiddenFalseOrderByRecordDateAsc(1L)).thenReturn(List.of());

        PathDetailResponse response = pathService.getPathDetail(1L, 1L);

        assertEquals("EMPTY", response.getSummaryStatus());
        assertNull(response.getSummary());
    }

    @Test
    void getPathDetail_afterReviewAt_withRecordsAndNoSummary_returnsReady() {
        Path path = buildPastReviewCompletedPath(1L);
        Record record = buildRecord(path, 10L, LocalDate.now().minusDays(2));

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(recordRepository.findAllByPath_IdAndIsHiddenFalseOrderByRecordDateAsc(1L)).thenReturn(List.of(record));
        when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.empty());

        PathDetailResponse response = pathService.getPathDetail(1L, 1L);

        assertEquals("READY", response.getSummaryStatus());
        assertNull(response.getSummary());
    }

    @Test
    void getPathDetail_doneSummary_returnsPayload() throws Exception {
        Path path = buildPastReviewCompletedPath(1L);
        Record record = buildRecord(path, 10L, LocalDate.now().minusDays(2));
        PathSummary summary = PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-test")
            .inputHash("hash")
            .build();
        summary.complete(objectMapper.writeValueAsString(buildPayload()));

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(recordRepository.findAllByPath_IdAndIsHiddenFalseOrderByRecordDateAsc(1L)).thenReturn(List.of(record));
        when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.of(summary));

        PathDetailResponse response = pathService.getPathDetail(1L, 1L);

        assertEquals("DONE", response.getSummaryStatus());
        assertEquals("천천히 나아갔습니다.", response.getSummary().getHeadline());
    }

    private Path buildFutureReviewPath(Long id) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("study")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().plusDays(7))
            .build();
        setId(path, id);
        return path;
    }

    private Path buildPath(Long id) {
        return buildFutureReviewPath(id);
    }

    private Path buildPastReviewCompletedPath(Long id) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("study")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().minusDays(1))
            .build();
        setId(path, id);
        path.complete();
        return path;
    }

    private Record buildRecord(Path path, Long id, LocalDate recordDate) {
        Record record = Record.builder()
            .user(null)
            .path(path)
            .categoryCode(path.getCategoryCode())
            .recordDate(recordDate)
            .sceneText("한 장면")
            .oneWordText("한 단어")
            .tomorrowText("내일 계획")
            .moodCode("잔잔")
            .build();
        setId(record, id);
        return record;
    }

    private PathSummaryPayload buildPayload() {
        PathSummaryPayload payload = new PathSummaryPayload();
        payload.setHeadline("천천히 나아갔습니다.");
        payload.setBody("흐름이 이어졌습니다.");
        payload.setPerspective("스스로 흔들림을 줄이려는 관점이 읽힙니다.");
        payload.setObservations(List.of("기록이 끊기지 않았습니다."));
        payload.setImprovements(List.of("흔들린 날의 이유를 더 또렷하게 남기면 좋습니다."));
        payload.setSuggestions(List.of("내일 한 걸음을 더 작게 쪼개 적어보세요."));
        payload.setClosing("다음에도 이어가 보세요.");
        return payload;
    }

    private void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (Exception e) {
            throw new IllegalStateException("테스트 데이터 id 설정 실패", e);
        }
    }
}
