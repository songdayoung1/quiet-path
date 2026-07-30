package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.domain.notification.entity.NotificationDelivery;
import kr.co.quietpath.domain.notification.repository.NotificationDeliveryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class NotificationDeliveryClaimWriter {

    private final NotificationDeliveryRepository deliveryRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void create(Long userId, String type, Long targetId, LocalDate scheduledDate) {
        deliveryRepository.saveAndFlush(NotificationDelivery.create(userId, type, targetId, scheduledDate));
    }
}
