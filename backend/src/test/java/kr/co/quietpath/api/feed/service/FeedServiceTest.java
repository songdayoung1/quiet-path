package kr.co.quietpath.api.feed.service;

import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Response;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private PathRepository pathRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FeedService feedService;

    @Test
    void weeklyTop3_sortingUsesTieBreakers() {
        ReactionRepository.WeeklyTop3Projection p1 = projection(10L, 5L, LocalDateTime.of(2026, 2, 7, 10, 0));
        ReactionRepository.WeeklyTop3Projection p2 = projection(11L, 5L, LocalDateTime.of(2026, 2, 7, 10, 0));
        ReactionRepository.WeeklyTop3Projection p3 = projection(12L, 5L, LocalDateTime.of(2026, 2, 6, 9, 0));

        when(reactionRepository.findWeeklyTop3Candidates(any(), any()))
            .thenReturn(List.of(p1, p2, p3));

        Path path10 = buildPath(10L, 1L, LocalDateTime.of(2026, 2, 7, 10, 0));
        Path path11 = buildPath(11L, 2L, LocalDateTime.of(2026, 2, 7, 10, 0));
        Path path12 = buildPath(12L, 3L, LocalDateTime.of(2026, 2, 6, 9, 0));
        when(pathRepository.findByIdIn(List.of(11L, 10L, 12L)))
            .thenReturn(List.of(path10, path11, path12));

        when(userRepository.findByIdIn(any()))
            .thenReturn(List.of(buildUser(1L), buildUser(2L), buildUser(3L)));

        when(reactionRepository.findReactedPathIds(any(), any()))
            .thenReturn(List.of());

        WeeklyTop3Response response = feedService.getWeeklyTop3(99L);

        assertEquals(3, response.getItems().size());
        assertEquals(11L, response.getItems().get(0).getPathId());
        assertEquals(10L, response.getItems().get(1).getPathId());
        assertEquals(12L, response.getItems().get(2).getPathId());
    }

    @Test
    void weeklyTop3_isReactedMappingUsesUserId() {
        ReactionRepository.WeeklyTop3Projection p1 = projection(10L, 7L, LocalDateTime.of(2026, 2, 7, 10, 0));
        ReactionRepository.WeeklyTop3Projection p2 = projection(11L, 6L, LocalDateTime.of(2026, 2, 7, 9, 0));

        when(reactionRepository.findWeeklyTop3Candidates(any(), any()))
            .thenReturn(List.of(p1, p2));

        Path path10 = buildPath(10L, 1L, LocalDateTime.of(2026, 2, 7, 10, 0));
        Path path11 = buildPath(11L, 2L, LocalDateTime.of(2026, 2, 7, 9, 0));
        when(pathRepository.findByIdIn(List.of(10L, 11L)))
            .thenReturn(List.of(path10, path11));

        when(userRepository.findByIdIn(any()))
            .thenReturn(List.of(buildUser(1L), buildUser(2L)));

        when(reactionRepository.findReactedPathIds(99L, List.of(10L, 11L)))
            .thenReturn(List.of(11L));

        WeeklyTop3Response response = feedService.getWeeklyTop3(99L);

        assertEquals(false, response.getItems().get(0).isReacted());
        assertEquals(true, response.getItems().get(1).isReacted());
    }

    @Test
    void feed_cursorPaginationAndOrdering() {
        Record r1 = buildRecord(101L, LocalDateTime.of(2026, 2, 8, 9, 12));
        Record r2 = buildRecord(102L, LocalDateTime.of(2026, 2, 8, 8, 0));
        Record r3 = buildRecord(103L, LocalDateTime.of(2026, 2, 7, 22, 0));

        when(recordRepository.findPublicFeedRecords(eq("PUBLIC"), any(), any(), any()))
            .thenReturn(List.of(r1, r2, r3));

        when(reactionRepository.countByRecordIds(List.of(101L, 102L)))
            .thenReturn(List.of(
                reactionCount(101L, 3L),
                reactionCount(102L, 1L)
            ));

        when(reactionRepository.findReactedRecordIds(99L, List.of(101L, 102L)))
            .thenReturn(List.of());

        var response = feedService.getFeed(99L, 2, null);

        assertEquals(2, response.getItems().size());
        assertEquals(101L, response.getItems().get(0).getRecordId());
        assertEquals(102L, response.getItems().get(1).getRecordId());
        assertEquals(true, response.isHasNext());
        assertEquals("2026-02-08T08:00:00_102", response.getNextCursor());
    }

    @Test
    void feed_privateNotExposed() {
        when(recordRepository.findPublicFeedRecords(eq("PUBLIC"), any(), any(), any()))
            .thenReturn(List.of());

        var response = feedService.getFeed(99L, 20, null);

        verify(recordRepository).findPublicFeedRecords(eq("PUBLIC"), any(), any(), any());
        assertEquals(0, response.getItems().size());
        assertEquals(false, response.isHasNext());
    }

    private ReactionRepository.WeeklyTop3Projection projection(Long pathId, Long reactionCount, LocalDateTime updatedAt) {
        return new ReactionRepository.WeeklyTop3Projection() {
            @Override
            public Long getPathId() {
                return pathId;
            }

            @Override
            public Long getReactionCount() {
                return reactionCount;
            }

            @Override
            public LocalDateTime getUpdatedAt() {
                return updatedAt;
            }
        };
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

    private Record buildRecord(Long recordId, LocalDateTime createdAt) {
        User user = buildUser(1L);
        Path path = buildPath(201L, 1L, createdAt);
        Record record = Record.builder()
            .user(user)
            .path(path)
            .categoryCode("DEFAULT")
            .recordDate(java.time.LocalDate.now())
            .sceneText("오늘은 10분 명상을 했다")
            .oneWordText(null)
            .tomorrowText(null)
            .moodCode(null)
            .build();
        setField(record, "id", recordId);
        setField(record, "createdAt", createdAt);
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
