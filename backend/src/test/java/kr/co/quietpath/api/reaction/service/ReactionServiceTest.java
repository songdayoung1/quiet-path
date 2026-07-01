package kr.co.quietpath.api.reaction.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.api.reaction.dto.request.ReactionCreateRequest;
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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

    private Record buildRecord(String visibility) {
        User user = User.createGoogle("provider", "user@example.com", "nick");
        Record record = Record.builder()
            .user(user)
            .path(Path.builder()
                .userId(1L)
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
        if ("PUBLIC".equals(visibility)) {
            record.share();
        }
        return record;
    }
}
