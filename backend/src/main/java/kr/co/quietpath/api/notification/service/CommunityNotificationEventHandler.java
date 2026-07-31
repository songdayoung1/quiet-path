package kr.co.quietpath.api.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommunityNotificationEventHandler {

    private final CommunityNotificationService communityNotificationService;

    @Async("notificationTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(CommunityNotificationRequestedEvent event) {
        try {
            communityNotificationService.createNotification(event)
                .ifPresent(communityNotificationService::sendWebPush);
        } catch (RuntimeException exception) {
            log.warn(
                "Community notification delivery failed: type={}, sourceId={}, recipientUserId={}",
                event.type(),
                event.sourceId(),
                event.recipientUserId(),
                exception
            );
        }
    }
}
