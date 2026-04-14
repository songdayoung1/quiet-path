package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.request.PathCreateRequest;
import kr.co.quietpath.api.path.dto.response.PathDetailResponse;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
        request.setDirectionText("설명");
        request.setReviewAt(LocalDate.now());

        ApiException ex = assertThrows(ApiException.class, () -> pathService.createPath(1L, request));
        assertEquals(ErrorCode.INVALID_PERIOD, ex.getErrorCode());
    }

    @Test
    void getPathDetail_summaryExistsBeforeReviewAt_returnsLocked() {
        Path path = buildPath(1L);
        PathSummary summary = PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-test")
            .inputHash("hash")
            .build();
        summary.complete("요약");

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        lenient().when(pathSummaryRepository.findByPathIdOrderByVersionNoDesc(1L)).thenReturn(List.of(summary));
        when(recordRepository.findAllByPath_IdOrderByRecordDateAsc(1L)).thenReturn(List.of());

        PathDetailResponse response = pathService.getPathDetail(1L, 1L);

        assertEquals("LOCKED", response.getSummaryStatus());
        assertNull(response.getSummary());
    }

    private Path buildPath(Long id) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("DEFAULT")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().plusDays(7))
            .build();
        setId(path, id);
        return path;
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
