package kr.co.quietpath.api.summary.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class PathSummaryGenerationEventHandler {

    private final PathSummaryGenerationService pathSummaryGenerationService;

    @Async("pathSummaryTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(PathSummaryRequestedEvent event) {
        pathSummaryGenerationService.generateSummary(event.summaryId());
    }
}
