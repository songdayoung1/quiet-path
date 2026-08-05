package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.comment.service.CommentPageCacheService;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.reaction.entity.Reaction;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WithdrawalCommunityDataServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private CommentPageCacheService commentPageCacheService;

    @Mock
    private WeeklyTop3CacheService weeklyTop3CacheService;

    @InjectMocks
    private WithdrawalCommunityDataService withdrawalCommunityDataService;

    @Test
    void anonymizeCommentsAndDeleteReactions_keepsCommentsAndRemovesReactionCounts() {
        User actor = User.createKakao("actor-provider", "actor@example.com", "actor");
        Record firstRecord = buildRecord();
        Record secondRecord = buildRecord();
        setField(firstRecord, "reactionCount", 2);
        setField(secondRecord, "reactionCount", 1);
        Reaction firstReaction = Reaction.builder().record(firstRecord).user(actor).build();
        Reaction secondReaction = Reaction.builder().record(secondRecord).user(actor).build();

        when(commentRepository.findDistinctRecordIdsByUserId(1L)).thenReturn(List.of(10L, 11L));
        when(commentRepository.anonymizeByUserId(any(Long.class), any(LocalDateTime.class))).thenReturn(2);
        when(reactionRepository.findAllWithRecordByUserId(1L)).thenReturn(List.of(firstReaction, secondReaction));

        withdrawalCommunityDataService.anonymizeCommentsAndDeleteReactions(1L);

        verify(commentPageCacheService).evictRecord(10L);
        verify(commentPageCacheService).evictRecord(11L);
        verify(reactionRepository).deleteAllInBatch(List.of(firstReaction, secondReaction));
        verify(weeklyTop3CacheService).evict();
        assertEquals(1, firstRecord.getReactionCount());
        assertEquals(0, secondRecord.getReactionCount());
    }

    @Test
    void anonymizeCommentsAndDeleteReactions_skipsCacheEvictionWhenThereIsNoActivity() {
        when(commentRepository.findDistinctRecordIdsByUserId(1L)).thenReturn(List.of());
        when(commentRepository.anonymizeByUserId(any(Long.class), any(LocalDateTime.class))).thenReturn(0);
        when(reactionRepository.findAllWithRecordByUserId(1L)).thenReturn(List.of());

        withdrawalCommunityDataService.anonymizeCommentsAndDeleteReactions(1L);

        verifyNoInteractions(commentPageCacheService, weeklyTop3CacheService);
    }

    private Record buildRecord() {
        return Record.builder()
            .categoryCode("STUDY")
            .recordDate(LocalDate.of(2026, 8, 4))
            .sceneText("기록")
            .build();
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
