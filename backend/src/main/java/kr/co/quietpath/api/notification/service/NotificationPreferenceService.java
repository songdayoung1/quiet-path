package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.notification.dto.request.NotificationPreferenceUpdateRequest;
import kr.co.quietpath.api.notification.dto.response.NotificationPreferenceResponse;
import kr.co.quietpath.domain.notification.entity.NotificationPreference;
import kr.co.quietpath.domain.notification.repository.NotificationPreferenceRepository;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    @Transactional
    public NotificationPreferenceResponse getPreference(Long userId) {
        NotificationPreference preference = findOrCreate(userId);
        return toResponse(preference);
    }

    @Transactional
    public NotificationPreferenceResponse updatePreference(
        Long userId,
        NotificationPreferenceUpdateRequest request
    ) {
        validateTimeZone(request.getTimeZone());
        NotificationPreference preference = findOrCreate(userId);
        preference.update(
            request.getReactionEnabled(),
            request.getCommentEnabled(),
            request.getReviewReminderEnabled(),
            request.getReviewReminderTime(),
            request.getTimeZone()
        );
        return toResponse(preference);
    }

    private NotificationPreference findOrCreate(Long userId) {
        return preferenceRepository.findByUserId(userId)
            .orElseGet(() -> {
                if (!userRepository.existsById(userId)) {
                    throw new ApiException(ErrorCode.USER_NOT_FOUND);
                }
                return preferenceRepository.save(NotificationPreference.createDefault(userId));
            });
    }

    private void validateTimeZone(String timeZone) {
        try {
            ZoneId.of(timeZone);
        } catch (DateTimeException exception) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "지원하지 않는 시간대입니다.");
        }
    }

    private NotificationPreferenceResponse toResponse(NotificationPreference preference) {
        return NotificationPreferenceResponse.builder()
            .reactionEnabled(preference.isReactionEnabled())
            .commentEnabled(preference.isCommentEnabled())
            .reviewReminderEnabled(preference.isReviewReminderEnabled())
            .reviewReminderTime(preference.getReviewReminderTime().format(TIME_FORMATTER))
            .timeZone(preference.getTimeZone())
            .build();
    }
}
