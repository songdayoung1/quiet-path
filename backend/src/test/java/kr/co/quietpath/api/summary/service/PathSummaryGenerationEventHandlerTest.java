package kr.co.quietpath.api.summary.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PathSummaryGenerationEventHandlerTest {

    @Mock
    private PathSummaryGenerationService pathSummaryGenerationService;

    @InjectMocks
    private PathSummaryGenerationEventHandler pathSummaryGenerationEventHandler;

    @Test
    void handle_triggersGeneration() {
        pathSummaryGenerationEventHandler.handle(new PathSummaryRequestedEvent(77L));

        verify(pathSummaryGenerationService).generateSummary(77L);
    }
}
