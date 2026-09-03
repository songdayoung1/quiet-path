package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.api.comment.dto.request.CommentCreateRequest;
import kr.co.quietpath.api.comment.dto.request.CommentListQuery;
import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.api.notification.service.CommunityNotificationRequestedEvent;
import kr.co.quietpath.api.notification.service.CommunityNotificationType;
import kr.co.quietpath.domain.comment.entity.Comment;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WeeklyTop3CacheService weeklyTop3CacheService;

    @Mock
    private CommentPageCacheService commentPageCacheService;

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private CommentService commentService;

    @Test
    void createComment_privateRecord_returns403() {
        CommentCreateRequest request = new CommentCreateRequest();
        request.setRecordId(10L);
        request.setContent("좋은 기록이네요");

        Record record = buildRecord("PRIVATE");
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        ApiException ex = assertThrows(ApiException.class, () -> commentService.createComment(1L, request));
        assertEquals(ErrorCode.TARGET_NOT_PUBLIC, ex.getErrorCode());
    }

    @Test
    void createComment_returnsServerCommentCount() {
        CommentCreateRequest request = new CommentCreateRequest();
        request.setRecordId(10L);
        request.setContent("좋은 기록이네요");

        Record record = buildRecord("PUBLIC", 2L);
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));
        when(userRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(commentRepository.countByRecordIdAndDeletedFalse(10L)).thenReturn(3L);
        doAnswer(invocation -> {
            Comment saved = invocation.getArgument(0);
            setField(saved, "id", 101L);
            setField(saved, "createdAt", LocalDateTime.now());
            setField(saved, "updatedAt", LocalDateTime.now());
            return saved;
        }).when(commentRepository).save(any(Comment.class));

        var response = commentService.createComment(1L, request);

        assertEquals(10L, response.getRecordId());
        assertEquals(3L, response.getCommentCount());
        verify(commentRepository).save(argThat(comment -> comment.getRecordId().equals(10L)));
        verify(applicationEventPublisher).publishEvent(argThat((Object event) ->
            event instanceof CommentCacheInvalidationRequestedEvent cacheEvent
                && cacheEvent.recordIds().equals(Set.of(10L))
        ));
        verify(weeklyTop3CacheService).evict();
        verify(applicationEventPublisher).publishEvent(argThat((Object event) -> {
            if (!(event instanceof CommunityNotificationRequestedEvent notificationEvent)) {
                return false;
            }
            return notificationEvent.type() == CommunityNotificationType.COMMENT
                && notificationEvent.sourceId().equals(101L)
                && notificationEvent.recipientUserId().equals(2L)
                && notificationEvent.actorUserId().equals(1L)
                && notificationEvent.actorNickname().equals("nick1")
                && notificationEvent.recordId().equals(10L);
        }));
    }

    @Test
    void deleteComment_returnsServerCommentCount() {
        Comment comment = Comment.builder()
            .recordId(10L)
            .userId(1L)
            .content("원래 내용")
            .build();
        setField(comment, "id", 100L);

        when(commentRepository.findById(100L)).thenReturn(Optional.of(comment));
        when(commentRepository.countByRecordIdAndDeletedFalse(10L)).thenReturn(4L);

        var response = commentService.deleteComment(1L, 100L);

        assertEquals(10L, response.getRecordId());
        assertEquals(4L, response.getCommentCount());
        assertEquals(true, response.isDeleted());
        verify(applicationEventPublisher).publishEvent(argThat((Object event) ->
            event instanceof CommentCacheInvalidationRequestedEvent cacheEvent
                && cacheEvent.recordIds().equals(Set.of(10L))
        ));
        verify(weeklyTop3CacheService).evict();
    }

    @Test
    void getComments_privateRecord_doesNotUseCommentCache() {
        Record record = buildRecord("PRIVATE");
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));

        CommentListQuery query = new CommentListQuery();
        query.setRecordId(10L);
        query.setPage(0);
        query.setSize(20);

        ApiException ex = assertThrows(ApiException.class, () -> commentService.getComments(query));

        assertEquals(ErrorCode.TARGET_NOT_PUBLIC, ex.getErrorCode());
        verifyNoInteractions(commentPageCacheService);
    }

    @Test
    void getComments_normalizesPageAndSizeBeforeDelegatingToCache() {
        Record record = buildRecord("PUBLIC");
        when(recordRepository.findByIdAndIsHiddenFalse(10L)).thenReturn(Optional.of(record));
        CommentListResponse cachedResponse = CommentListResponse.builder()
            .items(List.of())
            .page(0)
            .size(50)
            .totalElements(0)
            .totalPages(0)
            .build();
        when(commentPageCacheService.getComments(10L, 0, 50)).thenReturn(cachedResponse);

        CommentListQuery query = new CommentListQuery();
        query.setRecordId(10L);
        query.setPage(-1);
        query.setSize(999);

        var response = commentService.getComments(query);

        assertEquals(50, response.getSize());
        verify(commentPageCacheService).getComments(10L, 0, 50);
    }

    private Record buildRecord(String visibility) {
        return buildRecord(visibility, 1L);
    }

    private Record buildRecord(String visibility, Long ownerId) {
        User user = buildUser(ownerId);
        Path path = Path.builder()
            .userId(ownerId)
            .categoryCode("DEFAULT")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().plusDays(7))
            .build();
        Record record = Record.builder()
            .user(user)
            .path(path)
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
        User user = User.createGoogle("provider" + userId, "user" + userId + "@example.com", "nick" + userId);
        setField(user, "id", userId);
        return user;
    }

    private void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new IllegalStateException("테스트 데이터 필드 설정 실패", e);
        }
    }
}
