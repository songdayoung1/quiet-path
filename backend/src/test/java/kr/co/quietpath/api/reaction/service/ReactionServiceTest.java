package kr.co.quietpath.api.reaction.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.api.notification.service.CommunityNotificationRequestedEvent;
import kr.co.quietpath.api.notification.service.CommunityNotificationType;
import kr.co.quietpath.api.reaction.dto.request.ReactionCreateRequest;
import kr.co.quietpath.domain.reaction.entity.Reaction;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReactionServiceTest {

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WeeklyTop3CacheService weeklyTop3CacheService;

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private ReactionService reactionService;

    @Test
    void createReaction_duplicate_returns409() {
        ReactionCreateRequest request = new ReactionCreateRequest();
        request.setTargetType("RECORD");
        request.setTargetId(10L);

        Record record = buildRecord("PUBLIC");
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));
        when(reactionRepository.existsByUserIdAndTargetTypeAndTargetId(1L, "RECORD", 10L))
            .thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> reactionService.createReaction(1L, request));
        assertEquals(ErrorCode.REACTION_ALREADY_EXISTS, ex.getErrorCode());
    }

    @Test
    void createReaction_privateRecord_returns403() {
        ReactionCreateRequest request = new ReactionCreateRequest();
        request.setTargetType("RECORD");
        request.setTargetId(10L);

        Record record = buildRecord("PRIVATE");
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        ApiException ex = assertThrows(ApiException.class, () -> reactionService.createReaction(1L, request));
        assertEquals(ErrorCode.TARGET_NOT_PUBLIC, ex.getErrorCode());
    }

    @Test
    void createReaction_publishesCommunityNotificationAfterSaving() {
        ReactionCreateRequest request = new ReactionCreateRequest();
        request.setTargetType("RECORD");
        request.setTargetId(10L);

        Record record = buildRecord("PUBLIC", 2L);
        User actor = buildUser(1L);
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));
        when(userRepository.findById(1L)).thenReturn(Optional.of(actor));
        when(reactionRepository.countByTargetTypeAndTargetId("RECORD", 10L)).thenReturn(1L);
        doAnswer(invocation -> {
            Reaction saved = invocation.getArgument(0);
            setField(saved, "id", 101L);
            return saved;
        }).when(reactionRepository).save(any(Reaction.class));

        reactionService.createReaction(1L, request);

        verify(applicationEventPublisher).publishEvent(argThat((Object event) -> {
            CommunityNotificationRequestedEvent notificationEvent =
                (CommunityNotificationRequestedEvent) event;
            return notificationEvent.type() == CommunityNotificationType.REACTION
                && notificationEvent.sourceId().equals(101L)
                && notificationEvent.recipientUserId().equals(2L)
                && notificationEvent.actorUserId().equals(1L)
                && notificationEvent.actorNickname().equals("nick1")
                && notificationEvent.recordId().equals(10L);
        }));
    }

    private Record buildRecord(String visibility) {
        return buildRecord(visibility, 1L);
    }

    private Record buildRecord(String visibility, Long ownerId) {
        User user = buildUser(ownerId);
        Record record = Record.builder()
            .user(user)
            .path(Path.builder()
                .userId(ownerId)
                .categoryCode("DEFAULT")
                .directionName("질문")
                .directionText("설명")
                .reviewAt(java.time.LocalDateTime.now().plusDays(7))
                .build())
            .categoryCode("DEFAULT")
            .recordDate(java.time.LocalDate.now())
            .sceneText("내용")
            .oneWordText(null)
            .tomorrowText(null)
            .moodCode(null)
            .build();
        setField(record, "id", 10L);
        if ("PUBLIC".equals(visibility)) {
            record.share();
        }
        return record;
    }

    private User buildUser(Long userId) {
        User user = User.createGoogle(
            "provider" + userId,
            "user" + userId + "@example.com",
            "nick" + userId
        );
        setField(user, "id", userId);
        return user;
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
