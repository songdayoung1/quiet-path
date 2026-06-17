package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.api.comment.dto.request.CommentCreateRequest;
import kr.co.quietpath.api.comment.dto.request.CommentListQuery;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CommentService commentService;

    @Test
    void createComment_privateRecord_returns403() {
        CommentCreateRequest request = new CommentCreateRequest();
        request.setRecordId(10L);
        request.setContent("좋은 기록이네요");

        Record record = buildRecord("PRIVATE");
        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

        ApiException ex = assertThrows(ApiException.class, () -> commentService.createComment(1L, request));
        assertEquals(ErrorCode.TARGET_NOT_PUBLIC, ex.getErrorCode());
    }

    @Test
    void deleteComment_softDelete_hidesCommentFromList() {
        Record record = buildRecord("PUBLIC");
        when(recordRepository.findById(10L)).thenReturn(Optional.of(record));

        Comment comment = Comment.builder()
            .recordId(10L)
            .userId(1L)
            .content("원래 내용")
            .build();
        setField(comment, "id", 100L);
        comment.softDelete();

        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(
            10L,
            PageRequest.of(0, 20))
        ).thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        CommentListQuery query = new CommentListQuery();
        query.setRecordId(10L);
        query.setPage(0);
        query.setSize(20);

        var response = commentService.getComments(query);

        assertEquals(0, response.getItems().size());
        assertEquals(0, response.getTotalElements());
    }

    private Record buildRecord(String visibility) {
        User user = buildUser(1L);
        Path path = Path.builder()
            .userId(1L)
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
