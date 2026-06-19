package kr.co.quietpath.api.feed.service;

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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeeklyTop3CacheServiceTest {

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private RecordRepository recordRepository;

    @InjectMocks
    private WeeklyTop3CacheService weeklyTop3CacheService;

    @Test
    void weeklyTop3Base_sortingUsesTieBreakers() {
        ReactionRepository.WeeklyTop3Projection p1 = projection(10L, 5L, LocalDateTime.of(2026, 2, 7, 10, 0));
        ReactionRepository.WeeklyTop3Projection p2 = projection(11L, 5L, LocalDateTime.of(2026, 2, 7, 10, 0));
        ReactionRepository.WeeklyTop3Projection p3 = projection(12L, 5L, LocalDateTime.of(2026, 2, 6, 9, 0));

        when(reactionRepository.findWeeklyTop3Candidates(any(), any()))
            .thenReturn(List.of(p1, p2, p3));

        Record record10 = buildRecord(10L, 110L, 1L, "study", LocalDateTime.of(2026, 2, 6, 8, 0), LocalDateTime.of(2026, 2, 6, 8, 10));
        Record record11 = buildRecord(11L, 111L, 2L, "workout", LocalDateTime.of(2026, 2, 7, 8, 0), LocalDateTime.of(2026, 2, 7, 8, 10));
        Record record12 = buildRecord(12L, 112L, 3L, "hobby", LocalDateTime.of(2026, 2, 5, 8, 0), LocalDateTime.of(2026, 2, 5, 8, 10));
        when(recordRepository.findAllById(List.of(11L, 10L, 12L)))
            .thenReturn(List.of(record10, record11, record12));

        when(reactionRepository.countByRecordIds(List.of(11L, 10L, 12L)))
            .thenReturn(List.of(
                reactionCount(10L, 5L),
                reactionCount(11L, 7L),
                reactionCount(12L, 3L)
            ));
        when(commentRepository.countByRecordIds(List.of(11L, 10L, 12L)))
            .thenReturn(List.of(
                commentCount(10L, 1L),
                commentCount(11L, 2L),
                commentCount(12L, 0L)
            ));

        var response = weeklyTop3CacheService.getWeeklyTop3Base();

        assertEquals(3, response.getItems().size());
        assertEquals(11L, response.getItems().get(0).getRecordId());
        assertEquals(10L, response.getItems().get(1).getRecordId());
        assertEquals(12L, response.getItems().get(2).getRecordId());
    }

    @Test
    void weeklyTop3Base_returnsEmptyWhenNoCandidates() {
        when(reactionRepository.findWeeklyTop3Candidates(any(), any()))
            .thenReturn(List.of());

        var response = weeklyTop3CacheService.getWeeklyTop3Base();

        assertEquals(0, response.getItems().size());
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
