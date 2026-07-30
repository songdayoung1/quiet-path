package kr.co.quietpath.api.notification.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunityNotificationEventHandlerTest {

    @Mock
    private CommunityNotificationService communityNotificationService;

    @InjectMocks
    private CommunityNotificationEventHandler eventHandler;

    @Test
    void handle_createdNotification_sendsWebPush() {
        CommunityNotificationRequestedEvent event = event();
        CommunityNotificationDelivery delivery = new CommunityNotificationDelivery(
            2L,
            new WebPushPayload("제목", "내용", "/", "tag")
        );
        when(communityNotificationService.createNotification(event))
            .thenReturn(Optional.of(delivery));

        eventHandler.handle(event);

        verify(communityNotificationService).createNotification(event);
        verify(communityNotificationService).sendWebPush(delivery);
    }

    @Test
    void handle_deliveryFailure_doesNotPropagate() {
        CommunityNotificationRequestedEvent event = event();
        when(communityNotificationService.createNotification(event))
            .thenThrow(new IllegalStateException("DB 오류"));

        assertDoesNotThrow(() -> eventHandler.handle(event));

        verify(communityNotificationService).createNotification(event);
        verifyNoMoreInteractions(communityNotificationService);
    }

    private CommunityNotificationRequestedEvent event() {
        return new CommunityNotificationRequestedEvent(
            CommunityNotificationType.REACTION,
            101L,
            2L,
            1L,
            "민들레",
            10L
        );
    }
}
