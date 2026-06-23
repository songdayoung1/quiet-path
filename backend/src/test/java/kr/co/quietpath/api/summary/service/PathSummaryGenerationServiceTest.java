package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PathSummaryGenerationServiceTest {

    @Mock
    private AiSummaryClient aiSummaryClient;

    @Mock
    private PathSummaryStateService pathSummaryStateService;

    private PathSummaryGenerationService pathSummaryGenerationService;

    @BeforeEach
    void setUp() {
        pathSummaryGenerationService = new PathSummaryGenerationService(
            aiSummaryClient,
            pathSummaryStateService
        );
    }

    @Test
    void generateSummaryAsync_success_marksDone() {
        PathSummaryPayload payload = new PathSummaryPayload();
        payload.setHeadline("천천히 나아갔습니다.");
        payload.setBody("흐름이 이어졌습니다.");
        payload.setPerspective("스스로를 정돈하려는 관점이 읽힙니다.");
        payload.setObservations(List.of("기록이 끊기지 않았습니다."));
        payload.setImprovements(List.of("흔들린 날의 이유를 더 남기면 좋습니다."));
        payload.setSuggestions(List.of("내일 한 걸음을 더 작게 적어보세요."));
        payload.setClosing("다음에도 이어가 보세요.");

        SummaryGenerationContext context = SummaryGenerationContext.builder()
            .summaryId(100L)
            .request(AiSummaryRequest.builder().directionName("질문").build())
            .build();

        when(pathSummaryStateService.startProcessing(100L)).thenReturn(context);
        when(aiSummaryClient.summarize(any(AiSummaryRequest.class))).thenReturn(payload);

        pathSummaryGenerationService.generateSummary(100L);

        verify(pathSummaryStateService).complete(100L, payload);
    }

    @Test
    void generateSummaryAsync_failure_marksFailed() {
        SummaryGenerationContext context = SummaryGenerationContext.builder()
            .summaryId(100L)
            .request(AiSummaryRequest.builder().directionName("질문").build())
            .build();

        when(pathSummaryStateService.startProcessing(100L)).thenReturn(context);
        when(aiSummaryClient.summarize(any(AiSummaryRequest.class))).thenThrow(new IllegalStateException("boom"));

        pathSummaryGenerationService.generateSummary(100L);

        verify(pathSummaryStateService).fail(100L);
    }

    @Test
    void generateSummary_missingSummaryContext_stops() {
        when(pathSummaryStateService.startProcessing(100L)).thenReturn(null);

        pathSummaryGenerationService.generateSummary(100L);

        verify(pathSummaryStateService).startProcessing(100L);
    }
}
