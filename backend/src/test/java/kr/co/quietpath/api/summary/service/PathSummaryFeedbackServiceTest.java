package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.response.PathSummaryFeedbackResponse;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PathSummaryFeedbackServiceTest {

    @Mock
    private PathRepository pathRepository;

    @Mock
    private PathSummaryRepository pathSummaryRepository;

    @InjectMocks
    private PathSummaryFeedbackService pathSummaryFeedbackService;

    @Test
    void update_completedSummary_savesHelpfulState() {
        Path path = buildPath(1L, 10L);
        PathSummary summary = buildSummary(path);
        summary.complete("{}");
        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.of(summary));

        PathSummaryFeedbackResponse response = pathSummaryFeedbackService.update(10L, 1L, true);

        assertEquals(1L, response.getPathId());
        assertTrue(response.isHelpful());
        assertTrue(summary.getHelpful());
    }

    @Test
    void update_otherUsersPath_returnsNotOwner() {
        Path path = buildPath(1L, 10L);
        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));

        ApiException ex = assertThrows(
            ApiException.class,
            () -> pathSummaryFeedbackService.update(20L, 1L, true)
        );

        assertEquals(ErrorCode.NOT_OWNER, ex.getErrorCode());
    }

    @Test
    void update_processingSummary_returnsFeedbackNotAvailable() {
        Path path = buildPath(1L, 10L);
        PathSummary summary = buildSummary(path);
        summary.startProcessing();
        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.of(summary));

        ApiException ex = assertThrows(
            ApiException.class,
            () -> pathSummaryFeedbackService.update(10L, 1L, true)
        );

        assertEquals(ErrorCode.AI_SUMMARY_FEEDBACK_NOT_AVAILABLE, ex.getErrorCode());
    }

    private Path buildPath(Long pathId, Long userId) {
        Path path = Path.builder()
            .userId(userId)
            .categoryCode("study")
            .directionName("방향")
            .reviewAt(LocalDateTime.now().minusDays(1))
            .build();
        setId(path, pathId);
        path.complete();
        return path;
    }

    private PathSummary buildSummary(Path path) {
        return PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-test")
            .inputHash("hash")
            .build();
    }

    private void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("테스트 데이터 id 설정 실패", ex);
        }
    }
}
