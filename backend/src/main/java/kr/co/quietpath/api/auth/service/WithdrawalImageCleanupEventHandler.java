package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.record.service.RecordImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class WithdrawalImageCleanupEventHandler {

    private final RecordImageService recordImageService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(WithdrawalImageCleanupRequestedEvent event) {
        event.storageKeys().forEach(this::deleteImage);
    }

    private void deleteImage(String storageKey) {
        try {
            recordImageService.delete(storageKey);
        } catch (RuntimeException exception) {
            log.warn("Failed to delete withdrawn user's record image. storageKey={}", storageKey, exception);
        }
    }
}
