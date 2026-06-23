package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.api.path.dto.response.PathSummaryPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PathSummaryGenerationService {

    private final AiSummaryClient aiSummaryClient;
    private final PathSummaryStateService pathSummaryStateService;

    public void generateSummary(Long summaryId) {
        SummaryGenerationContext context = pathSummaryStateService.startProcessing(summaryId);
        if (context == null) {
            return;
        }

        try {
            PathSummaryPayload payload = aiSummaryClient.summarize(context.getRequest());
            pathSummaryStateService.complete(summaryId, payload);
        } catch (Exception ex) {
            pathSummaryStateService.fail(summaryId);
            log.warn("AI summary generation failed. summaryId={}", summaryId, ex);
        }
    }
}
