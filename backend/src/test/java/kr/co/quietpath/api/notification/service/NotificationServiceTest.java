package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.notification.dto.response.NotificationReadAllResponse;
import kr.co.quietpath.domain.notification.entity.Notification;
import kr.co.quietpath.domain.notification.repository.NotificationRepository;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void readNotification_notOwner_returns403() {
        Notification notification = buildNotification(2L, 10L);
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));

        ApiException ex = assertThrows(ApiException.class, () -> notificationService.readNotification(1L, 10L));

        assertEquals(ErrorCode.NOT_OWNER, ex.getErrorCode());
    }

    @Test
    void readAll_updatesOnlyUnread_andReturnsUpdatedCount() {
        Long userId = 1L;
        List<Notification> notifications = new ArrayList<>();
        notifications.add(buildNotification(userId, 1L));
        notifications.add(buildNotification(userId, 2L));

        Notification alreadyRead = buildNotification(userId, 3L);
        LocalDateTime previousReadAt = LocalDateTime.now().minusDays(1);
        alreadyRead.markRead(previousReadAt);
        notifications.add(alreadyRead);

        when(notificationRepository.markAllAsRead(eq(userId), any(LocalDateTime.class)))
            .thenAnswer(invocation -> {
                LocalDateTime readAt = invocation.getArgument(1);
                int updated = 0;
                for (Notification notification : notifications) {
                    if (notification.getRecipientUserId().equals(userId) && !notification.isRead()) {
                        notification.markRead(readAt);
                        updated++;
                    }
                }
                return updated;
            });

        NotificationReadAllResponse response = notificationService.readAll(userId);

        assertEquals(2, response.getUpdatedCount());
        long readCount = notifications.stream().filter(Notification::isRead).count();
        assertEquals(3, readCount);
        assertEquals(previousReadAt, alreadyRead.getReadAt());
    }

    private Notification buildNotification(Long recipientUserId, Long targetId) {
        return Notification.builder()
            .recipientUserId(recipientUserId)
            .type("COMMENT_CREATED")
            .actorUserId(99L)
            .targetType("RECORD")
            .targetId(targetId)
            .message("알림 메시지")
            .build();
    }
}
