package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.api.comment.dto.response.CommentListItem;
import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.domain.comment.entity.Comment;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static kr.co.quietpath.global.config.CacheConfig.CACHE_COMMENTS;

@Service
@RequiredArgsConstructor
public class CommentPageCacheService {

    private static final String COMMENT_VERSION_KEY_PREFIX = "comments:version:";
    private static final Duration COMMENT_VERSION_TTL = Duration.ofHours(24);

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate stringRedisTemplate;

    // 댓글 목록은 record/page/size/version 조합으로 캐시한다.
    // 버전이 바뀌면 기존 키를 직접 지우지 않아도 새 키로 다시 조회된다.
    @Cacheable(value = CACHE_COMMENTS, key = "#root.target.buildCacheKey(#recordId, #page, #size)")
    @Transactional(readOnly = true)
    public CommentListResponse getComments(Long recordId, int page, int size) {
        Page<Comment> commentPage = commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(
            recordId,
            PageRequest.of(page, size)
        );

        List<Comment> comments = commentPage.getContent();
        Set<Long> userIds = comments.stream()
            .map(Comment::getUserId)
            .collect(Collectors.toSet());

        Map<Long, User> userMap = userRepository.findByIdIn(List.copyOf(userIds)).stream()
            .collect(Collectors.toMap(User::getId, user -> user));

        List<CommentListItem> items = comments.stream()
            .map(comment -> {
                User user = userMap.get(comment.getUserId());
                return CommentListItem.builder()
                    .commentId(comment.getId())
                    .userId(comment.getUserId())
                    .nickname(user != null ? user.getNickname() : null)
                    .profileImageUrl(null)
                    .content(comment.getContent())
                    .deleted(comment.isDeleted())
                    .createdAt(formatDateTime(comment.getCreatedAt()))
                    .updatedAt(formatDateTime(comment.getUpdatedAt()))
                    .build();
            })
            .toList();

        return CommentListResponse.builder()
            .items(items)
            .page(commentPage.getNumber())
            .size(commentPage.getSize())
            .totalElements(commentPage.getTotalElements())
            .totalPages(commentPage.getTotalPages())
            .build();
    }

    // KEYS/SCAN 없이 레코드 단위 댓글 캐시를 무효화하기 위해 version 숫자만 올린다.
    public void evictRecord(Long recordId) {
        String versionKey = getVersionKey(recordId);
        stringRedisTemplate.opsForValue().increment(versionKey);
        stringRedisTemplate.expire(versionKey, COMMENT_VERSION_TTL);
    }

    // 같은 record/page/size라도 version이 달라지면 별도 캐시 엔트리로 취급된다.
    public String buildCacheKey(Long recordId, int page, int size) {
        return recordId + ":" + page + ":" + size + ":" + getVersion(recordId);
    }

    // version 값이 없으면 0부터 시작하고, 값이 깨져 있으면 초기화 후 다시 사용한다.
    private long getVersion(Long recordId) {
        String value = stringRedisTemplate.opsForValue().get(getVersionKey(recordId));
        if (value == null || value.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            stringRedisTemplate.delete(getVersionKey(recordId));
            return 0L;
        }
    }

    // 레코드별 댓글 캐시 네임스페이스를 구분하는 Redis 키다.
    private String getVersionKey(Long recordId) {
        return COMMENT_VERSION_KEY_PREFIX + recordId;
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
