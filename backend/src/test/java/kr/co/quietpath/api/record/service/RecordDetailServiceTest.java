package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.dto.response.RecordDetailResponse;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordDetailServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PathRepository pathRepository;

    @Mock
    private ReactionRepository reactionRepository;

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private RecordService recordService;

    @Test
    void privateRecord_notOwner_returns403() {
        Record record = buildRecord("PRIVATE", 1L, 10L);
        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

        ApiException ex = assertThrows(ApiException.class, () -> recordService.getRecordDetail(2L, 10L));
        assertEquals(ErrorCode.RECORD_NOT_PUBLIC, ex.getErrorCode());
    }

    @Test
    void publicRecord_countsAndIsReacted() {
        Record record = buildRecord("PUBLIC", 1L, 10L);
        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

        when(reactionRepository.countByTargetTypeAndTargetId("RECORD", 10L)).thenReturn(3L);
        when(reactionRepository.existsByUserIdAndTargetTypeAndTargetId(99L, "RECORD", 10L)).thenReturn(true);
        when(commentRepository.countByRecordId(10L)).thenReturn(2L);

        RecordDetailResponse response = recordService.getRecordDetail(99L, 10L);

        assertEquals(10L, response.getId());
        assertEquals(3L, response.getReactionCount());
        assertEquals(true, response.isReacted());
        assertEquals(2L, response.getCommentCount());
    }

    private Record buildRecord(String visibility, Long ownerId, Long recordId) {
        User owner = User.createGoogle("provider" + ownerId, "user" + ownerId + "@example.com", "nick" + ownerId);
        setField(owner, "id", ownerId);

        Path path = Path.builder()
            .userId(ownerId)
            .categoryCode("DEFAULT")
            .directionName("질문")
            .directionText("설명")
            .reviewAt(LocalDateTime.now().plusDays(7))
            .build();

        Record record = Record.builder()
            .user(owner)
            .path(path)
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
        setField(record, "id", recordId);
        return record;
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
