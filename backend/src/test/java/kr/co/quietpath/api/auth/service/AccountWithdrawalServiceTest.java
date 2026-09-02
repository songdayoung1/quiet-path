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
import kr.co.quietpath.domain.path.repository.PathCoverImageRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.entity.RecordImage;
import kr.co.quietpath.domain.record.repository.RecordImageRepository;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import kr.co.quietpath.domain.title.repository.UserTitleRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountWithdrawalServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenSessionRepository refreshTokenSessionRepository;
    @Mock
    private KakaoUnlinkService kakaoUnlinkService;
    @Mock
    private WithdrawalCommunityDataService withdrawalCommunityDataService;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationPreferenceRepository notificationPreferenceRepository;
    @Mock
    private WebPushSubscriptionRepository webPushSubscriptionRepository;
    @Mock
    private NotificationDeliveryRepository notificationDeliveryRepository;
    @Mock
    private UserTitleRepository userTitleRepository;
    @Mock
    private PathRepository pathRepository;

    @Mock
    private PathCoverImageRepository pathCoverImageRepository;
    @Mock
    private PathSummaryRepository pathSummaryRepository;
    @Mock
    private RecordRepository recordRepository;
    @Mock
    private RecordImageRepository recordImageRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private ReactionRepository reactionRepository;
    @Mock
    private WeeklyTop3CacheService weeklyTop3CacheService;
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private AccountWithdrawalService accountWithdrawalService;

    @Test
    void withdraw_deletesUserDataInForeignKeyOrderAndSchedulesImageCleanup() {
        User user = buildUser();
        RefreshTokenSession session = RefreshTokenSession.issue(1L, "session-1", "hash-1", 300L);
        Path path = buildPath(10L);
        RecordImage image = buildImage(30L, "records/2026/08/image.webp");
        Record record = buildRecord(20L, image);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(refreshTokenSessionRepository.findAllByUserId(1L)).thenReturn(List.of(session));
        when(pathRepository.findByUserIdOrderByReviewAtDesc(1L)).thenReturn(List.of(path));
        when(recordRepository.findAllWithImageByUserId(1L)).thenReturn(List.of(record));

        accountWithdrawalService.withdraw(1L);

        verify(notificationRepository).deleteAllByRecipientOrActorUserId(1L);
        verify(notificationPreferenceRepository).deleteAllByUserId(1L);
        verify(webPushSubscriptionRepository).deleteAllByUserId(1L);
        verify(notificationDeliveryRepository).deleteAllByUserId(1L);
        verify(userTitleRepository).deleteAllByUser_Id(1L);
        verify(weeklyTop3CacheService).evict();

        InOrder deletionOrder = inOrder(
            refreshTokenSessionRepository,
            kakaoUnlinkService,
            withdrawalCommunityDataService,
            pathRepository,
            commentRepository,
            reactionRepository,
            recordRepository,
            pathSummaryRepository,
            recordImageRepository,
            userRepository
        );
        deletionOrder.verify(refreshTokenSessionRepository).deleteAll(List.of(session));
        deletionOrder.verify(kakaoUnlinkService).unlink(user);
        deletionOrder.verify(withdrawalCommunityDataService).anonymizeCommentsAndDeleteReactions(1L);
        deletionOrder.verify(pathRepository).clearCoverRecordsByUserId(1L);
        deletionOrder.verify(commentRepository).deleteAllByRecordIds(List.of(20L));
        deletionOrder.verify(reactionRepository).deleteAllByRecordIds(List.of(20L));
        deletionOrder.verify(recordRepository).deleteAllByUserId(1L);
        deletionOrder.verify(pathSummaryRepository).deleteAllByPathIds(List.of(10L));
        deletionOrder.verify(pathRepository).deleteAllByUserId(1L);
        deletionOrder.verify(recordImageRepository).deleteAllByIds(List.of(30L));
        deletionOrder.verify(userRepository).deleteById(1L);

        ArgumentCaptor<WithdrawalImageCleanupRequestedEvent> eventCaptor =
            ArgumentCaptor.forClass(WithdrawalImageCleanupRequestedEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        assertEquals(List.of("records/2026/08/image.webp"), eventCaptor.getValue().storageKeys());
    }

    @Test
    void withdraw_withoutPathsOrRecords_skipsEmptyInQueriesAndImageCleanupEvent() {
        User user = buildUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(refreshTokenSessionRepository.findAllByUserId(1L)).thenReturn(List.of());
        when(pathRepository.findByUserIdOrderByReviewAtDesc(1L)).thenReturn(List.of());
        when(recordRepository.findAllWithImageByUserId(1L)).thenReturn(List.of());

        accountWithdrawalService.withdraw(1L);

        verify(commentRepository, never()).deleteAllByRecordIds(List.of());
        verify(reactionRepository, never()).deleteAllByRecordIds(List.of());
        verify(recordRepository, never()).deleteAllByUserId(1L);
        verify(pathSummaryRepository, never()).deleteAllByPathIds(List.of());
        verify(recordImageRepository, never()).deleteAllByIds(List.of());
        verify(applicationEventPublisher, never()).publishEvent(org.mockito.ArgumentMatchers.any());
        verify(pathRepository).deleteAllByUserId(1L);
        verify(userRepository).deleteById(1L);
        verify(kakaoUnlinkService).unlink(user);
    }

    @Test
    void withdraw_whenUserDoesNotExist_stopsBeforeDeletingData() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        ApiException exception = assertThrows(
            ApiException.class,
            () -> accountWithdrawalService.withdraw(1L)
        );

        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
        verify(withdrawalCommunityDataService, never()).anonymizeCommentsAndDeleteReactions(1L);
        verify(userRepository, never()).deleteById(1L);
    }

    @Test
    void withdraw_whenKakaoUnlinkFails_stopsBeforeDeletingLocalData() {
        User user = buildUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(refreshTokenSessionRepository.findAllByUserId(1L)).thenReturn(List.of());
        org.mockito.Mockito.doThrow(new ApiException(ErrorCode.KAKAO_UNLINK_FAILED))
            .when(kakaoUnlinkService).unlink(user);

        ApiException exception = assertThrows(
            ApiException.class,
            () -> accountWithdrawalService.withdraw(1L)
        );

        assertEquals(ErrorCode.KAKAO_UNLINK_FAILED, exception.getErrorCode());
        verify(withdrawalCommunityDataService, never()).anonymizeCommentsAndDeleteReactions(1L);
        verify(userRepository, never()).deleteById(1L);
    }

    private User buildUser() {
        User user = User.createKakao("12345", "user@example.com", "사용자");
        setField(user, "id", 1L);
        return user;
    }

    private Path buildPath(Long id) {
        Path path = Path.builder()
            .userId(1L)
            .categoryCode("STUDY")
            .directionName("자격증 공부")
            .reviewAt(LocalDateTime.of(2026, 8, 11, 21, 0))
            .build();
        setField(path, "id", id);
        return path;
    }

    private Record buildRecord(Long id, RecordImage image) {
        Record record = Record.builder()
            .categoryCode("STUDY")
            .recordDate(LocalDate.of(2026, 8, 5))
            .sceneText("기록")
            .build();
        record.attachImage(image);
        setField(record, "id", id);
        return record;
    }

    private RecordImage buildImage(Long id, String storageKey) {
        RecordImage image = RecordImage.builder()
            .storageKey(storageKey)
            .imageUrl("/uploads/" + storageKey)
            .build();
        setField(image, "id", id);
        return image;
    }

    private void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception exception) {
            throw new IllegalStateException("테스트 데이터 필드 설정 실패", exception);
        }
    }
}
