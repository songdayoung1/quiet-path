package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.domain.auth.entity.RefreshTokenSession;
import kr.co.quietpath.domain.auth.repository.RefreshTokenSessionRepository;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.notification.repository.NotificationDeliveryRepository;
import kr.co.quietpath.domain.notification.repository.NotificationPreferenceRepository;
import kr.co.quietpath.domain.notification.repository.NotificationRepository;
import kr.co.quietpath.domain.notification.repository.WebPushSubscriptionRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.entity.RecordImage;
import kr.co.quietpath.domain.record.repository.RecordImageRepository;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import kr.co.quietpath.domain.title.repository.UserTitleRepository;
import kr.co.quietpath.domain.user.repository.UserRepository;
import kr.co.quietpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AccountWithdrawalService {

    private final UserRepository userRepository;
    private final RefreshTokenSessionRepository refreshTokenSessionRepository;
    private final KakaoUnlinkService kakaoUnlinkService;
    private final WithdrawalCommunityDataService withdrawalCommunityDataService;
    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository notificationPreferenceRepository;
    private final WebPushSubscriptionRepository webPushSubscriptionRepository;
    private final NotificationDeliveryRepository notificationDeliveryRepository;
    private final UserTitleRepository userTitleRepository;
    private final PathRepository pathRepository;
    private final PathSummaryRepository pathSummaryRepository;
    private final RecordRepository recordRepository;
    private final RecordImageRepository recordImageRepository;
    private final CommentRepository commentRepository;
    private final ReactionRepository reactionRepository;
    private final WeeklyTop3CacheService weeklyTop3CacheService;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Transactional
    public void withdraw(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        List<RefreshTokenSession> sessions = refreshTokenSessionRepository.findAllByUserId(userId);
        if (!sessions.isEmpty()) {
            refreshTokenSessionRepository.deleteAll(sessions);
        }
        kakaoUnlinkService.unlink(user);

        withdrawalCommunityDataService.anonymizeCommentsAndDeleteReactions(userId);

        List<Long> pathIds = pathRepository.findByUserIdOrderByReviewAtDesc(userId).stream()
            .map(Path::getId)
            .toList();
        List<Record> records = recordRepository.findAllWithImageByUserId(userId);
        List<Long> recordIds = records.stream()
            .map(Record::getId)
            .toList();
        List<RecordImage> recordImages = records.stream()
            .map(Record::getImage)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        List<Long> imageIds = recordImages.stream()
            .map(RecordImage::getId)
            .toList();
        List<String> storageKeys = recordImages.stream()
            .map(RecordImage::getStorageKey)
            .filter(this::hasText)
            .distinct()
            .toList();

        notificationRepository.deleteAllByRecipientOrActorUserId(userId);
        notificationPreferenceRepository.deleteAllByUserId(userId);
        webPushSubscriptionRepository.deleteAllByUserId(userId);
        notificationDeliveryRepository.deleteAllByUserId(userId);
        userTitleRepository.deleteAllByUser_Id(userId);

        pathRepository.clearCoverRecordsByUserId(userId);
        if (!recordIds.isEmpty()) {
            commentRepository.deleteAllByRecordIds(recordIds);
            reactionRepository.deleteAllByRecordIds(recordIds);
            recordRepository.deleteAllByUserId(userId);
        }
        if (!pathIds.isEmpty()) {
            pathSummaryRepository.deleteAllByPathIds(pathIds);
        }
        pathRepository.deleteAllByUserId(userId);
        if (!imageIds.isEmpty()) {
            recordImageRepository.deleteAllByIds(imageIds);
        }

        userRepository.deleteById(userId);
        weeklyTop3CacheService.evict();
        if (!storageKeys.isEmpty()) {
            applicationEventPublisher.publishEvent(new WithdrawalImageCleanupRequestedEvent(storageKeys));
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
