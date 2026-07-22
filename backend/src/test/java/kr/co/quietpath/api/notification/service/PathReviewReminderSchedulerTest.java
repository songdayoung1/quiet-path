package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.Notification;
import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import kr.co.quietpath.domain.notification.repository.NotificationPreferenceRepository;
import kr.co.quietpath.domain.notification.repository.NotificationRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PathReviewReminderSchedulerTest {

    private static final Long USER_ID = 1L;
    private static final Long PATH_ID = 10L;
    private static final String TIME_ZONE = "Asia/Seoul";
    private static final LocalDate SCHEDULED_DATE = LocalDate.of(2026, 7, 22);

    @Mock
    private NotificationPreferenceRepository preferenceRepository;

    @Mock
    private PathRepository pathRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationDeliveryClaimService claimService;

    @Mock
    private WebPushDeliveryService webPushDeliveryService;

    @Mock
    private NotificationPreference preference;

    @Mock
    private Path path;

    private WebPushProperties webPushProperties;
    private PathReviewReminderScheduler scheduler;

    @BeforeEach
    void setUp() {
        webPushProperties = configuredProperties();
        Clock clock = Clock.fixed(Instant.parse("2026-07-22T12:00:00Z"), ZoneOffset.UTC);
        scheduler = new PathReviewReminderScheduler(
            webPushProperties,
            preferenceRepository,
            pathRepository,
            notificationRepository,
            claimService,
            webPushDeliveryService,
            clock
        );
    }

    @Test
    void sendDueReminders_queriesOnlyPreferencesMatchingTheirLocalMinute() {
        givenDuePreferenceAndActivePath();
        when(path.getDirectionName()).thenReturn("꾸준히 공부하기");
        when(claimService.tryClaim(USER_ID, PathReviewReminderScheduler.TYPE, PATH_ID, SCHEDULED_DATE))
            .thenReturn(true);

        scheduler.sendDueReminders();

        verify(preferenceRepository).findDistinctTimeZonesByReviewReminderEnabledTrue();
        verify(preferenceRepository)
            .findAllByReviewReminderEnabledTrueAndTimeZoneAndReviewReminderTime(
                TIME_ZONE,
                LocalTime.of(21, 0)
            );
        verify(pathRepository).findByUserIdInAndStatus(List.of(USER_ID), "ACTIVE");

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification notification = notificationCaptor.getValue();
        assertEquals(USER_ID, notification.getRecipientUserId());
        assertEquals(PATH_ID, notification.getTargetId());
        assertEquals(PathReviewReminderScheduler.TYPE, notification.getType());

        ArgumentCaptor<WebPushPayload> payloadCaptor = ArgumentCaptor.forClass(WebPushPayload.class);
        verify(webPushDeliveryService).sendToUser(eq(USER_ID), payloadCaptor.capture());
        assertEquals("path-review-10-2026-07-22", payloadCaptor.getValue().tag());
    }

    @Test
    void sendDueReminders_doesNotSendWhenDeliveryWasAlreadyClaimed() {
        givenDuePreferenceAndActivePath();
        when(claimService.tryClaim(USER_ID, PathReviewReminderScheduler.TYPE, PATH_ID, SCHEDULED_DATE))
            .thenReturn(false);

        scheduler.sendDueReminders();

        verify(notificationRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(webPushDeliveryService);
    }

    @Test
    void sendDueReminders_skipsPathWhoseReviewDateIsNotToday() {
        givenDuePreference();
        when(pathRepository.findByUserIdInAndStatus(List.of(USER_ID), "ACTIVE"))
            .thenReturn(List.of(path));
        when(path.getUserId()).thenReturn(USER_ID);
        when(path.getReviewAt()).thenReturn(LocalDateTime.of(2026, 7, 23, 9, 0));

        scheduler.sendDueReminders();

        verifyNoInteractions(claimService, notificationRepository, webPushDeliveryService);
    }

    @Test
    void sendDueReminders_stopsBeforeDatabaseLookupWhenVapidIsNotConfigured() {
        webPushProperties.setPrivateKey("");

        scheduler.sendDueReminders();

        verifyNoInteractions(
            preferenceRepository,
            pathRepository,
            notificationRepository,
            claimService,
            webPushDeliveryService
        );
    }

    @Test
    void sendDueReminders_skipsInvalidTimeZoneWithoutStoppingOtherSchedules() {
        when(preferenceRepository.findDistinctTimeZonesByReviewReminderEnabledTrue())
            .thenReturn(List.of("Invalid/TimeZone"));

        scheduler.sendDueReminders();

        verify(preferenceRepository, never())
            .findAllByReviewReminderEnabledTrueAndTimeZoneAndReviewReminderTime(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any()
            );
        verifyNoInteractions(pathRepository, notificationRepository, claimService, webPushDeliveryService);
    }

    private void givenDuePreferenceAndActivePath() {
        givenDuePreference();
        when(pathRepository.findByUserIdInAndStatus(List.of(USER_ID), "ACTIVE"))
            .thenReturn(List.of(path));
        when(path.getUserId()).thenReturn(USER_ID);
        when(path.getId()).thenReturn(PATH_ID);
        when(path.getReviewAt()).thenReturn(LocalDateTime.of(2026, 7, 22, 9, 0));
    }

    private void givenDuePreference() {
        when(preferenceRepository.findDistinctTimeZonesByReviewReminderEnabledTrue())
            .thenReturn(List.of(TIME_ZONE));
        when(preferenceRepository.findAllByReviewReminderEnabledTrueAndTimeZoneAndReviewReminderTime(
            TIME_ZONE,
            LocalTime.of(21, 0)
        )).thenReturn(List.of(preference));
        when(preference.getUserId()).thenReturn(USER_ID);
        when(preference.getTimeZone()).thenReturn(TIME_ZONE);
    }

    private WebPushProperties configuredProperties() {
        WebPushProperties properties = new WebPushProperties();
        properties.setPublicKey("public-key");
        properties.setPrivateKey("private-key");
        properties.setSubject("mailto:test@quietpath.app");
        return properties;
    }
}
