package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import kr.co.quietpath.domain.notification.repository.WebPushSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebPushDeliveryServiceTest {

    @Mock
    private WebPushSubscriptionRepository subscriptionRepository;

    @Mock
    private WebPushSender webPushSender;

    @InjectMocks
    private WebPushDeliveryService service;

    @Test
    void sendToUser_deletesExpiredSubscriptionAndCountsDeliveredSubscription() {
        Long userId = 1L;
        WebPushSubscription expired = subscription(userId, "https://push.example.com/expired");
        WebPushSubscription delivered = subscription(userId, "https://push.example.com/delivered");
        WebPushSubscription failed = subscription(userId, "https://push.example.com/failed");
        WebPushPayload payload = payload();
        when(subscriptionRepository.findAllByUserId(userId)).thenReturn(List.of(expired, delivered, failed));
        when(webPushSender.send(expired, payload)).thenReturn(WebPushSendResult.EXPIRED);
        when(webPushSender.send(delivered, payload)).thenReturn(WebPushSendResult.DELIVERED);
        when(webPushSender.send(failed, payload)).thenReturn(WebPushSendResult.FAILED);

        WebPushDeliveryReport report = service.sendToUserDetailed(userId, payload);

        assertEquals(new WebPushDeliveryReport(1, 1, 1), report);
        verify(subscriptionRepository).delete(expired);
        verify(subscriptionRepository, never()).delete(delivered);
        verify(subscriptionRepository, never()).delete(failed);
    }

    @Test
    void sendToUser_keepsSubscriptionWhenFailureMayBeTemporary() {
        Long userId = 1L;
        WebPushSubscription failed = subscription(userId, "https://push.example.com/failed");
        WebPushPayload payload = payload();
        when(subscriptionRepository.findAllByUserId(userId)).thenReturn(List.of(failed));
        when(webPushSender.send(failed, payload)).thenReturn(WebPushSendResult.FAILED);

        int deliveredCount = service.sendToUser(userId, payload);

        assertEquals(0, deliveredCount);
        verify(subscriptionRepository, never()).delete(failed);
    }

    private WebPushSubscription subscription(Long userId, String endpoint) {
        return WebPushSubscription.create(userId, endpoint, "p256dh", "auth", "test-agent");
    }

    private WebPushPayload payload() {
        return new WebPushPayload("title", "body", "/", "tag");
    }
}
