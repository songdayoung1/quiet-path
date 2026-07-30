package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.domain.notification.repository.NotificationDeliveryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDeliveryClaimServiceTest {

    private static final Long USER_ID = 1L;
    private static final String TYPE = "PATH_REVIEW_REMINDER";
    private static final Long TARGET_ID = 10L;
    private static final LocalDate SCHEDULED_DATE = LocalDate.of(2026, 7, 22);

    @Mock
    private NotificationDeliveryRepository deliveryRepository;

    @Mock
    private NotificationDeliveryClaimWriter claimWriter;

    @InjectMocks
    private NotificationDeliveryClaimService service;

    @Test
    void tryClaim_returnsFalseWithoutWritingWhenDeliveryAlreadyExists() {
        when(deliveryRepository.existsByUserIdAndTypeAndTargetIdAndScheduledDate(
            USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE
        )).thenReturn(true);

        boolean claimed = service.tryClaim(USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE);

        assertFalse(claimed);
        verify(claimWriter, never()).create(USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE);
    }

    @Test
    void tryClaim_returnsFalseWhenAnotherSchedulerWinsConcurrentInsert() {
        when(deliveryRepository.existsByUserIdAndTypeAndTargetIdAndScheduledDate(
            USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE
        )).thenReturn(false);
        doThrow(new DataIntegrityViolationException("duplicate delivery"))
            .when(claimWriter).create(USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE);

        boolean claimed = service.tryClaim(USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE);

        assertFalse(claimed);
    }

    @Test
    void tryClaim_returnsTrueWhenDeliveryIsCreated() {
        when(deliveryRepository.existsByUserIdAndTypeAndTargetIdAndScheduledDate(
            USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE
        )).thenReturn(false);

        boolean claimed = service.tryClaim(USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE);

        assertTrue(claimed);
        verify(claimWriter).create(USER_ID, TYPE, TARGET_ID, SCHEDULED_DATE);
    }
}
