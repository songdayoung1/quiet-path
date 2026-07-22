package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import kr.co.quietpath.domain.notification.repository.WebPushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WebPushDeliveryService {

    private final WebPushSubscriptionRepository subscriptionRepository;
    private final WebPushSender webPushSender;

    @Transactional
    public int sendToUser(Long userId, WebPushPayload payload) {
        List<WebPushSubscription> subscriptions = subscriptionRepository.findAllByUserId(userId);
        int deliveredCount = 0;

        for (WebPushSubscription subscription : subscriptions) {
            WebPushSendResult result = webPushSender.send(subscription, payload);
            if (result == WebPushSendResult.DELIVERED) {
                deliveredCount++;
            } else if (result == WebPushSendResult.EXPIRED) {
                subscriptionRepository.delete(subscription);
            }
        }
        return deliveredCount;
    }
}
