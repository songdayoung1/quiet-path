package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.response.PathSummaryStartResponse;
import kr.co.quietpath.api.summary.config.OpenAiProperties;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PathSummaryCommandServiceTest {

    @Mock
    private PathRepository pathRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private PathSummaryRepository pathSummaryRepository;

    @Mock
    private AiSummaryClient aiSummaryClient;

    @Mock
    private OpenAiProperties openAiProperties;

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private PathSummaryCommandService pathSummaryCommandService;

    @Test
    void requestSummary_beforeReviewAt_returnsLocked() {
        Path path = buildCompletedPath(1L, LocalDateTime.now().plusDays(1));
        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        doNothing().when(aiSummaryClient).ensureConfigured();

        ApiException ex = assertThrows(ApiException.class, () -> pathSummaryCommandService.requestSummary(1L, 1L));

        assertEquals(ErrorCode.PATH_SUMMARY_LOCKED, ex.getErrorCode());
    }

    @Test
    void requestSummary_withoutRecords_returnsEmpty() {
        Path path = buildCompletedPath(1L, LocalDateTime.now().minusDays(1));
        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(recordRepository.findAllByPath_IdOrderByRecordDateAsc(1L)).thenReturn(List.of());
        doNothing().when(aiSummaryClient).ensureConfigured();

        ApiException ex = assertThrows(ApiException.class, () -> pathSummaryCommandService.requestSummary(1L, 1L));

        assertEquals(ErrorCode.PATH_SUMMARY_EMPTY, ex.getErrorCode());
    }

    @Test
    void requestSummary_doneAlreadyExists_restartsGeneration() {
        Path path = buildCompletedPath(1L, LocalDateTime.now().minusDays(1));
        Record record = buildRecord(path, 10L);
        PathSummary summary = PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-test")
            .inputHash("hash")
            .build();
        summary.complete("{\"headline\":\"done\"}");

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(recordRepository.findAllByPath_IdOrderByRecordDateAsc(1L)).thenReturn(List.of(record));
        when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.of(summary));
        when(pathSummaryRepository.save(any(PathSummary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(openAiProperties.getSummaryPromptVersion()).thenReturn("v2");
        when(openAiProperties.getModel()).thenReturn("gpt-5.5");
        doNothing().when(aiSummaryClient).ensureConfigured();

        PathSummaryStartResponse response = pathSummaryCommandService.requestSummary(1L, 1L);

        assertEquals("PROCESSING", response.getSummaryStatus());
        assertEquals("PENDING", summary.getStatus());
        assertEquals("v2", summary.getPromptVersion());
        assertEquals("gpt-5.5", summary.getModel());
        assertEquals("JSON", summary.getFormat());
        verify(pathSummaryRepository).save(summary);
        verify(applicationEventPublisher).publishEvent(any(PathSummaryRequestedEvent.class));
    }

    @Test
    void requestSummary_processingAlreadyExists_returnsProcessing() {
        Path path = buildCompletedPath(1L, LocalDateTime.now().minusDays(1));
        Record record = buildRecord(path, 10L);
        PathSummary summary = PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-test")
            .inputHash("hash")
            .build();
        summary.startProcessing();

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(recordRepository.findAllByPath_IdOrderByRecordDateAsc(1L)).thenReturn(List.of(record));
        when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.of(summary));
        doNothing().when(aiSummaryClient).ensureConfigured();

        PathSummaryStartResponse response = pathSummaryCommandService.requestSummary(1L, 1L);

        assertEquals("PROCESSING", response.getSummaryStatus());
        verify(pathSummaryRepository, never()).save(any(PathSummary.class));
        verify(applicationEventPublisher, never()).publishEvent(any());
    }

    @Test
    void requestSummary_ready_createsPendingAndStartsAsync() {
        Path path = buildCompletedPath(1L, LocalDateTime.now().minusDays(1));
        Record record = buildRecord(path, 10L);

        when(pathRepository.findById(1L)).thenReturn(Optional.of(path));
        when(recordRepository.findAllByPath_IdOrderByRecordDateAsc(1L)).thenReturn(List.of(record));
        when(pathSummaryRepository.findTopByPathIdOrderByVersionNoDesc(1L)).thenReturn(Optional.empty());
        when(pathSummaryRepository.save(any(PathSummary.class))).thenAnswer(invocation -> {
            PathSummary summary = invocation.getArgument(0);
            setId(summary, 99L);
            return summary;
        });
        when(openAiProperties.getSummaryPromptVersion()).thenReturn("v1");
        when(openAiProperties.getModel()).thenReturn("gpt-5.5");
        doNothing().when(aiSummaryClient).ensureConfigured();

        PathSummaryStartResponse response = pathSummaryCommandService.requestSummary(1L, 1L);

        ArgumentCaptor<PathSummary> summaryCaptor = ArgumentCaptor.forClass(PathSummary.class);
        verify(pathSummaryRepository).save(summaryCaptor.capture());
        ArgumentCaptor<PathSummaryRequestedEvent> eventCaptor = ArgumentCaptor.forClass(PathSummaryRequestedEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        assertEquals("PROCESSING", response.getSummaryStatus());
        assertEquals("PENDING", summaryCaptor.getValue().getStatus());
        assertEquals("JSON", summaryCaptor.getValue().getFormat());
        assertEquals(99L, eventCaptor.getValue().summaryId());
    }

    private Path buildCompletedPath(Long id, LocalDateTime reviewAt) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("study")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(reviewAt)
            .build();
        setId(path, id);
        path.complete();
        return path;
    }

    private Record buildRecord(Path path, Long id) {
        Record record = Record.builder()
            .user(null)
            .path(path)
            .categoryCode(path.getCategoryCode())
            .recordDate(LocalDate.now().minusDays(2))
            .sceneText("한 장면")
            .oneWordText("한 단어")
            .tomorrowText("내일 계획")
            .moodCode("잔잔")
            .build();
        setId(record, id);
        return record;
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
