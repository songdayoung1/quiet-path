package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.domain.notification.repository.NotificationDeliveryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class NotificationDeliveryClaimService {

    private final NotificationDeliveryRepository deliveryRepository;
    private final NotificationDeliveryClaimWriter claimWriter;

    public boolean tryClaim(Long userId, String type, Long targetId, LocalDate scheduledDate) {
        if (deliveryRepository.existsByUserIdAndTypeAndTargetIdAndScheduledDate(
            userId,
            type,
            targetId,
            scheduledDate
        )) {
            return false;
        }
        try {
            claimWriter.create(userId, type, targetId, scheduledDate);
            return true;
        } catch (DataIntegrityViolationException exception) {
            return false;
        }
    }
}
