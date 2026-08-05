package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.domain.comment.entity.Comment;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentPageCacheServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private CommentPageCacheService commentPageCacheService;

    @Test
    void getComments_usesActiveCommentQueryAndMapsUsers() {
        Comment comment = Comment.builder()
            .recordId(10L)
            .userId(1L)
            .content("댓글")
            .build();
        setField(comment, "id", 101L);
        setField(comment, "createdAt", LocalDateTime.of(2026, 6, 18, 10, 0));
        setField(comment, "updatedAt", LocalDateTime.of(2026, 6, 18, 10, 5));

        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(
            10L,
            PageRequest.of(0, 20))
        ).thenReturn(new PageImpl<>(List.of(comment), PageRequest.of(0, 20), 1));
        when(userRepository.findByIdIn(List.of(1L))).thenReturn(List.of(buildUser(1L)));

        var response = commentPageCacheService.getComments(10L, 0, 20);

        assertEquals(1, response.getItems().size());
        assertEquals("nick1", response.getItems().get(0).getNickname());
        assertEquals(1L, response.getTotalElements());
        verify(commentRepository).findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(10L, PageRequest.of(0, 20));
    }

    @Test
    void getComments_mapsAnonymizedAuthorAsWithdrawnUser() {
        Comment comment = Comment.builder()
            .recordId(10L)
            .userId(1L)
            .content("남겨 둘 댓글")
            .build();
        comment.anonymizeAuthor();
        setField(comment, "id", 102L);

        when(commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(
            10L,
            PageRequest.of(0, 20))
        ).thenReturn(new PageImpl<>(List.of(comment), PageRequest.of(0, 20), 1));

        var response = commentPageCacheService.getComments(10L, 0, 20);

        assertNull(response.getItems().get(0).getUserId());
        assertEquals("탈퇴한 사용자", response.getItems().get(0).getNickname());
        verifyNoInteractions(userRepository);
    }

    @Test
    void buildCacheKey_appendsCurrentVersion() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("comments:version:10")).thenReturn("3");

        String key = commentPageCacheService.buildCacheKey(10L, 0, 20);

        assertEquals("10:0:20:3", key);
    }

    @Test
    void evictRecord_incrementsVersionNamespace() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        commentPageCacheService.evictRecord(10L);

        verify(valueOperations).increment("comments:version:10");
        verify(stringRedisTemplate).expire("comments:version:10", Duration.ofHours(24));
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
