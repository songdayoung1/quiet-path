package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.record.service.RecordImageService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class WithdrawalImageCleanupEventHandlerTest {

    @Test
    void handle_continuesDeletingRemainingImagesWhenOneDeletionFails() {
        RecordImageService recordImageService = mock(RecordImageService.class);
        WithdrawalImageCleanupEventHandler handler = new WithdrawalImageCleanupEventHandler(recordImageService);
        doThrow(new IllegalStateException("storage unavailable"))
            .when(recordImageService).delete("records/first.webp");

        handler.handle(new WithdrawalImageCleanupRequestedEvent(List.of(
            "records/first.webp",
            "records/second.webp"
        )));

        verify(recordImageService).delete("records/first.webp");
        verify(recordImageService).delete("records/second.webp");
    }
}
