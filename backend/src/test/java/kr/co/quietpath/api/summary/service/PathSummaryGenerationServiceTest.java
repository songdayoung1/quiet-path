package kr.co.quietpath.api.summary.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PathSummaryGenerationServiceTest {

    @Mock
    private PathSummaryRepository pathSummaryRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private AiSummaryClient aiSummaryClient;

    private PathSummaryGenerationService pathSummaryGenerationService;

    @BeforeEach
    void setUp() {
        pathSummaryGenerationService = new PathSummaryGenerationService(
            pathSummaryRepository,
            recordRepository,
            aiSummaryClient,
            new ObjectMapper()
        );
    }

    @Test
    void generateSummaryAsync_success_marksDone() {
        Path path = buildCompletedPath(1L);
        Record record = buildRecord(path, 10L);
        PathSummary summary = PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-5.5")
            .inputHash("hash")
            .build();
        setId(summary, 100L);

        PathSummaryPayload payload = new PathSummaryPayload();
        payload.setHeadline("천천히 나아갔습니다.");
        payload.setBody("흐름이 이어졌습니다.");
        payload.setObservations(List.of("기록이 끊기지 않았습니다."));
        payload.setClosing("다음에도 이어가 보세요.");

        when(pathSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(recordRepository.findAllByPath_IdOrderByRecordDateAsc(1L)).thenReturn(List.of(record));
        when(aiSummaryClient.summarize(org.mockito.ArgumentMatchers.any())).thenReturn(payload);

        pathSummaryGenerationService.generateSummary(100L);

        assertEquals("DONE", summary.getStatus());
    }

    @Test
    void generateSummaryAsync_failure_marksFailed() {
        Path path = buildCompletedPath(1L);
        Record record = buildRecord(path, 10L);
        PathSummary summary = PathSummary.builder()
            .path(path)
            .versionNo(1)
            .promptVersion("v1")
            .model("gpt-5.5")
            .inputHash("hash")
            .build();
        setId(summary, 100L);

        when(pathSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(recordRepository.findAllByPath_IdOrderByRecordDateAsc(1L)).thenReturn(List.of(record));
        when(aiSummaryClient.summarize(org.mockito.ArgumentMatchers.any())).thenThrow(new IllegalStateException("boom"));

        pathSummaryGenerationService.generateSummary(100L);

        assertEquals("FAILED", summary.getStatus());
    }

    private Path buildCompletedPath(Long id) {
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
