package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.notification.dto.request.NotificationPreferenceUpdateRequest;
import kr.co.quietpath.api.notification.dto.response.NotificationPreferenceResponse;
import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import kr.co.quietpath.domain.notification.repository.NotificationPreferenceRepository;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {

    @Mock
    private NotificationPreferenceRepository preferenceRepository;

    @Mock
    private UserRepository userRepository;

    private NotificationPreferenceService service;

    @BeforeEach
    void setUp() {
        service = new NotificationPreferenceService(preferenceRepository, userRepository);
    }

    @Test
    void getPreference_createsDefaultForExistingUser() {
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(userRepository.existsById(1L)).thenReturn(true);
        when(preferenceRepository.save(any(NotificationPreference.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        NotificationPreferenceResponse response = service.getPreference(1L);

        assertEquals(false, response.isReactionEnabled());
        assertEquals(false, response.isCommentEnabled());
        assertEquals(false, response.isReviewReminderEnabled());
        assertEquals("21:00", response.getReviewReminderTime());
        assertEquals("Asia/Seoul", response.getTimeZone());
        verify(preferenceRepository).save(any(NotificationPreference.class));
    }

    @Test
    void updatePreference_rejectsInvalidTimeZone() {
        NotificationPreferenceUpdateRequest request = new NotificationPreferenceUpdateRequest();
        request.setReactionEnabled(true);
        request.setCommentEnabled(true);
        request.setReviewReminderEnabled(true);
        request.setReviewReminderTime(LocalTime.of(20, 30));
        request.setTimeZone("invalid-zone");

        assertThrows(ApiException.class, () -> service.updatePreference(1L, request));
    }
}
