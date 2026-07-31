package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.domain.notification.entity.Notification;
import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import kr.co.quietpath.domain.notification.repository.NotificationPreferenceRepository;
import kr.co.quietpath.domain.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunityNotificationServiceTest {

    @Mock
    private NotificationPreferenceRepository preferenceRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private WebPushDeliveryService webPushDeliveryService;

    @InjectMocks
    private CommunityNotificationService communityNotificationService;

    @Test
    void createNotification_reactionEnabled_savesNotificationAndPreparesPush() {
        NotificationPreference preference = preference(2L, true, false);
        when(preferenceRepository.findByUserId(2L)).thenReturn(Optional.of(preference));
        when(notificationRepository.save(any(Notification.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        CommunityNotificationRequestedEvent event = new CommunityNotificationRequestedEvent(
            CommunityNotificationType.REACTION,
            101L,
            2L,
            1L,
            "민들레",
            10L
        );

        CommunityNotificationDelivery delivery = communityNotificationService.createNotification(event)
            .orElseThrow();

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification notification = notificationCaptor.getValue();
        assertEquals("REACTION_CREATED", notification.getType());
        assertEquals(2L, notification.getRecipientUserId());
        assertEquals(1L, notification.getActorUserId());
        assertEquals("RECORD", notification.getTargetType());
        assertEquals(10L, notification.getTargetId());
        assertEquals("내 기록에 공감했어요.", notification.getMessage());
        assertEquals("새로운 공감이 도착했어요", delivery.payload().title());
        assertEquals("민들레님이 내 기록에 공감했어요.", delivery.payload().body());
        assertEquals("/?view=community", delivery.payload().url());

        communityNotificationService.sendWebPush(delivery);
        verify(webPushDeliveryService).sendToUser(2L, delivery.payload());
    }

    @Test
    void createNotification_commentDisabled_skipsNotification() {
        NotificationPreference preference = preference(2L, true, false);
        when(preferenceRepository.findByUserId(2L)).thenReturn(Optional.of(preference));
        CommunityNotificationRequestedEvent event = new CommunityNotificationRequestedEvent(
            CommunityNotificationType.COMMENT,
            201L,
            2L,
            1L,
            "민들레",
            10L
        );

        assertTrue(communityNotificationService.createNotification(event).isEmpty());

        verifyNoInteractions(notificationRepository, webPushDeliveryService);
    }

    @Test
    void createNotification_commentEnabled_usesCommentMessage() {
        NotificationPreference preference = preference(2L, false, true);
        when(preferenceRepository.findByUserId(2L)).thenReturn(Optional.of(preference));
        when(notificationRepository.save(any(Notification.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        CommunityNotificationRequestedEvent event = new CommunityNotificationRequestedEvent(
            CommunityNotificationType.COMMENT,
            201L,
            2L,
            1L,
            "고요한밤",
            10L
        );

        CommunityNotificationDelivery delivery = communityNotificationService.createNotification(event)
            .orElseThrow();

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        assertEquals("COMMENT_CREATED", notificationCaptor.getValue().getType());
        assertEquals("내 기록에 댓글을 남겼어요.", notificationCaptor.getValue().getMessage());
        assertEquals("새로운 댓글이 도착했어요", delivery.payload().title());
        assertEquals("고요한밤님이 내 기록에 댓글을 남겼어요.", delivery.payload().body());
    }

    @Test
    void createNotification_selfActivity_skipsPreferenceLookupAndNotification() {
        CommunityNotificationRequestedEvent event = new CommunityNotificationRequestedEvent(
            CommunityNotificationType.REACTION,
            101L,
            1L,
            1L,
            "민들레",
            10L
        );

        assertTrue(communityNotificationService.createNotification(event).isEmpty());

        verifyNoInteractions(preferenceRepository, notificationRepository, webPushDeliveryService);
    }

    private NotificationPreference preference(
        Long userId,
        boolean reactionEnabled,
        boolean commentEnabled
    ) {
        NotificationPreference preference = NotificationPreference.createDefault(userId);
        preference.update(
            reactionEnabled,
            commentEnabled,
            false,
            LocalTime.of(21, 0),
            "Asia/Seoul"
        );
        return preference;
    }
}
