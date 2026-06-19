package kr.co.quietpath.api.feed.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Response;
import kr.co.quietpath.api.feed.dto.response.OwnerSummary;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseItem;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Window;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private WeeklyTop3CacheService weeklyTop3CacheService;

    @InjectMocks
    private FeedService feedService;

    @Test
    void weeklyTop3_preservesCachedBaseOrder() {
        when(weeklyTop3CacheService.getWeeklyTop3Base())
            .thenReturn(baseResponse(List.of(
                baseItem(11L, 7L, 2L),
                baseItem(10L, 5L, 1L),
                baseItem(12L, 3L, 0L)
            )));

        when(reactionRepository.findReactedRecordIds(99L, List.of(11L, 10L, 12L)))
            .thenReturn(List.of());

        WeeklyTop3Response response = feedService.getWeeklyTop3(99L);

        assertEquals(3, response.getItems().size());
        assertEquals(11L, response.getItems().get(0).getRecordId());
        assertEquals(10L, response.getItems().get(1).getRecordId());
        assertEquals(12L, response.getItems().get(2).getRecordId());
    }

    @Test
    void weeklyTop3_isReactedMappingUsesUserId() {
        when(weeklyTop3CacheService.getWeeklyTop3Base())
            .thenReturn(baseResponse(List.of(
                baseItem(10L, 4L, 1L),
                baseItem(11L, 2L, 0L)
            )));

        when(reactionRepository.findReactedRecordIds(99L, List.of(10L, 11L)))
            .thenReturn(List.of(11L));

        WeeklyTop3Response response = feedService.getWeeklyTop3(99L);

        assertEquals(false, response.getItems().get(0).isReacted());
        assertEquals(true, response.getItems().get(1).isReacted());
    }

    @Test
    void feed_cursorPaginationAndOrderingUsesSharedAt() {
        Record r1 = buildRecord(101L, 301L, 1L, "study", LocalDateTime.of(2026, 2, 8, 8, 40), LocalDateTime.of(2026, 2, 8, 9, 12));
        Record r2 = buildRecord(102L, 302L, 1L, "study", LocalDateTime.of(2026, 2, 8, 7, 10), LocalDateTime.of(2026, 2, 8, 8, 0));
        Record r3 = buildRecord(103L, 303L, 1L, "study", LocalDateTime.of(2026, 2, 7, 21, 5), LocalDateTime.of(2026, 2, 7, 22, 0));

        when(recordRepository.findPublicFeedRecords(eq("PUBLIC"), eq(null), any(), any(), any()))
            .thenReturn(List.of(r1, r2, r3));

        when(reactionRepository.countByRecordIds(List.of(101L, 102L)))
            .thenReturn(List.of(
                reactionCount(101L, 3L),
                reactionCount(102L, 1L)
            ));
        when(commentRepository.countByRecordIds(List.of(101L, 102L)))
            .thenReturn(List.of(
                commentCount(101L, 2L),
                commentCount(102L, 5L)
            ));

        when(reactionRepository.findReactedRecordIds(99L, List.of(101L, 102L)))
            .thenReturn(List.of());

        var response = feedService.getFeed(99L, null, 2, null);

        assertEquals(2, response.getItems().size());
        assertEquals(101L, response.getItems().get(0).getRecordId());
        assertEquals(102L, response.getItems().get(1).getRecordId());
        assertEquals(2L, response.getItems().get(0).getCommentCount());
        assertEquals("study", response.getItems().get(0).getCategoryCode());
        assertEquals(true, response.isHasNext());
        assertEquals("2026-02-08T08:00:00_102", response.getNextCursor());
    }

    @Test
    void feed_privateNotExposed() {
        when(recordRepository.findPublicFeedRecords(eq("PUBLIC"), eq(null), any(), any(), any()))
            .thenReturn(List.of());

        var response = feedService.getFeed(99L, null, 20, null);

        verify(recordRepository).findPublicFeedRecords(eq("PUBLIC"), eq(null), any(), any(), any());
        assertEquals(0, response.getItems().size());
        assertEquals(false, response.isHasNext());
    }

    @Test
    void feedReadWithoutUserDoesNotLookupReactionState() {
        Record record = buildRecord(201L, 401L, 1L, "hobby", LocalDateTime.of(2026, 2, 8, 8, 40), LocalDateTime.of(2026, 2, 8, 9, 12));

        when(recordRepository.findPublicFeedRecords(eq("PUBLIC"), eq("hobby"), any(), any(), any()))
            .thenReturn(List.of(record));
        when(reactionRepository.countByRecordIds(List.of(201L)))
            .thenReturn(List.of(reactionCount(201L, 4L)));
        when(commentRepository.countByRecordIds(List.of(201L)))
            .thenReturn(List.of(commentCount(201L, 1L)));

        var response = feedService.getFeed(null, "hobby", 20, null);

        assertEquals(1, response.getItems().size());
        assertEquals(false, response.getItems().get(0).isReacted());
        verify(reactionRepository, never()).findReactedRecordIds(any(), any());
    }

    @Test
    void feed_categoryFilterPassesNormalizedCategoryCode() {
        when(recordRepository.findPublicFeedRecords(eq("PUBLIC"), eq("workout"), any(), any(), any()))
            .thenReturn(List.of());

        feedService.getFeed(99L, "WORKOUT", 20, null);

        verify(recordRepository).findPublicFeedRecords(eq("PUBLIC"), eq("workout"), any(), any(), any());
    }

    @Test
    void feed_invalidCategoryRejected() {
        assertThrows(ApiException.class, () -> feedService.getFeed(99L, "invalid", 20, null));
    }

    private ReactionRepository.WeeklyTop3Projection projection(Long recordId, Long reactionCount, LocalDateTime reactedAt) {
        return new ReactionRepository.WeeklyTop3Projection() {
            @Override
            public Long getRecordId() {
                return recordId;
            }

            @Override
            public Long getReactionCount() {
                return reactionCount;
            }

            @Override
            public LocalDateTime getReactedAt() {
                return reactedAt;
            }
        };
    }

    private WeeklyTop3BaseResponse baseResponse(List<WeeklyTop3BaseItem> items) {
        return WeeklyTop3BaseResponse.builder()
            .window(WeeklyTop3Window.builder()
                .from("2026-06-11")
                .to("2026-06-18")
                .build())
            .items(items)
            .build();
    }

    private WeeklyTop3BaseItem baseItem(Long recordId, Long reactionCount, Long commentCount) {
        return WeeklyTop3BaseItem.builder()
            .pathId(recordId + 100L)
            .recordId(recordId)
            .title("질문 " + recordId)
            .content("내용 " + recordId)
            .status("ACTIVE")
            .owner(OwnerSummary.builder()
                .userId(recordId)
                .nickname("nick" + recordId)
                .profileImageUrl(null)
                .build())
            .categoryCode("study")
            .reactionCount(reactionCount)
            .commentCount(commentCount)
            .sharedAt("2026-06-18T10:00:00")
            .createdAt("2026-06-18T09:00:00")
            .build();
    }

    private Path buildPath(Long pathId, Long ownerId, LocalDateTime updatedAt) {
        Path path = Path.builder()
            .userId(ownerId)
            .categoryCode("DEFAULT")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().plusDays(7))
            .build();
        setField(path, "id", pathId);
        setField(path, "createdAt", updatedAt.minusDays(1));
        setField(path, "updatedAt", updatedAt);
        return path;
    }

    private Record buildRecord(Long recordId, Long pathId, Long ownerId, String categoryCode, LocalDateTime createdAt, LocalDateTime sharedAt) {
        User user = buildUser(ownerId);
        Path path = buildPath(pathId, ownerId, createdAt);
        Record record = Record.builder()
            .user(user)
            .path(path)
            .categoryCode(categoryCode)
            .recordDate(java.time.LocalDate.now())
            .sceneText("오늘은 10분 명상을 했다")
            .oneWordText(null)
            .tomorrowText(null)
            .moodCode(null)
            .build();
        setField(record, "id", recordId);
        setField(record, "createdAt", createdAt);
        setField(record, "sharedAt", sharedAt);
        setField(record, "visibility", "PUBLIC");
        return record;
    }

    private ReactionRepository.RecordReactionCountProjection reactionCount(Long recordId, Long count) {
        return new ReactionRepository.RecordReactionCountProjection() {
            @Override
            public Long getRecordId() {
                return recordId;
            }

            @Override
            public Long getReactionCount() {
                return count;
            }
        };
    }

    private CommentRepository.RecordCommentCountProjection commentCount(Long recordId, Long count) {
        return new CommentRepository.RecordCommentCountProjection() {
            @Override
            public Long getRecordId() {
                return recordId;
            }

            @Override
            public Long getCommentCount() {
                return count;
            }
        };
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
