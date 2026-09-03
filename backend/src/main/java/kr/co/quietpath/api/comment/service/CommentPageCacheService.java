package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.api.comment.dto.response.CommentListItem;
import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.domain.comment.entity.Comment;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static kr.co.quietpath.global.config.CacheConfig.CACHE_COMMENTS;
import static kr.co.quietpath.global.config.CacheConfig.COMMENT_VERSION_TTL;

@Service
@Slf4j
@RequiredArgsConstructor
public class CommentPageCacheService {

    private static final String COMMENT_VERSION_KEY_PREFIX = "comments:version:";
    private static final DefaultRedisScript<Long> INCREMENT_VERSION_SCRIPT = new DefaultRedisScript<>(
        "local version = redis.call('INCR', KEYS[1]); "
            + "redis.call('EXPIRE', KEYS[1], ARGV[1]); "
            + "return version;",
        Long.class
    );
    private static final DefaultRedisScript<Long> RECOVER_INVALID_VERSION_SCRIPT = new DefaultRedisScript<>(
        "local value = redis.call('GET', KEYS[1]); "
            + "if value and value ~= ARGV[2] then "
            + "  local probe = redis.pcall('INCRBY', KEYS[1], 0); "
            + "  if type(probe) == 'number' and probe >= 0 then return probe; end; "
            + "end; "
            + "local now = redis.call('TIME'); "
            + "local recovered = tonumber(now[1] .. string.format('%06d', now[2])); "
            + "redis.call('SET', KEYS[1], recovered, 'EX', ARGV[1]); "
            + "return recovered;",
        Long.class
    );
    private static final String WITHDRAWN_USER_NICKNAME = "탈퇴한 사용자";

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final ThreadLocal<Boolean> cacheBypass = ThreadLocal.withInitial(() -> false);

    // 댓글 목록은 record/page/size/version 조합으로 캐시한다.
    // 버전이 바뀌면 기존 키를 직접 지우지 않아도 새 키로 다시 조회된다.
    @Cacheable(
        value = CACHE_COMMENTS,
        key = "#root.target.buildCacheKey(#recordId, #page, #size)",
        unless = "#root.target.consumeCacheBypass()"
    )
    @Transactional(readOnly = true)
    public CommentListResponse getComments(Long recordId, int page, int size) {
        Page<Comment> commentPage = commentRepository.findByRecordIdAndDeletedFalseOrderByCreatedAtAsc(
            recordId,
            PageRequest.of(page, size)
        );

        List<Comment> comments = commentPage.getContent();
        Set<Long> userIds = comments.stream()
            .map(Comment::getUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        Map<Long, User> userMap = userIds.isEmpty()
            ? Map.of()
            : userRepository.findByIdIn(List.copyOf(userIds)).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        List<CommentListItem> items = comments.stream()
            .map(comment -> {
                User user = comment.getUserId() != null
                    ? userMap.get(comment.getUserId())
                    : null;
                return CommentListItem.builder()
                    .commentId(comment.getId())
                    .userId(user != null ? user.getId() : null)
                    .nickname(user != null ? user.getNickname() : WITHDRAWN_USER_NICKNAME)
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
    // INCR와 EXPIRE는 Lua Script 하나로 실행해 version 키에 TTL이 빠지는 구간을 없앤다.
    public void evictRecord(Long recordId) {
        String versionKey = getVersionKey(recordId);
        Long version = stringRedisTemplate.execute(
            INCREMENT_VERSION_SCRIPT,
            List.of(versionKey),
            String.valueOf(COMMENT_VERSION_TTL.toSeconds())
        );
        if (version == null) {
            throw new IllegalStateException("댓글 캐시 version 증가 결과가 없습니다.");
        }
    }

    // 같은 record/page/size라도 version이 달라지면 별도 캐시 엔트리로 취급된다.
    public String buildCacheKey(Long recordId, int page, int size) {
        cacheBypass.remove();
        try {
            return recordId + ":" + page + ":" + size + ":" + getVersion(recordId);
        } catch (RuntimeException exception) {
            // version을 확인할 수 없으면 기존 키를 재사용하지 않고 결과 저장도 건너뛴다.
            cacheBypass.set(true);
            String fallbackKey = recordId + ":" + page + ":" + size + ":db-fallback:" + UUID.randomUUID();
            log.warn(
                "Comment cache version lookup failed; using DB fallback key: recordId={}, page={}, size={}",
                recordId,
                page,
                size,
                exception
            );
            return fallbackKey;
        }
    }

    // @Cacheable의 unless에서 호출돼 version 조회 실패 시 UUID 캐시 엔트리 저장을 막는다.
    public boolean consumeCacheBypass() {
        boolean bypass = Boolean.TRUE.equals(cacheBypass.get());
        cacheBypass.remove();
        return bypass;
    }

    // version 값이 없으면 0부터 시작하고, 잘못된 값은 v0와 충돌하지 않는 새 값으로 복구한다.
    private long getVersion(Long recordId) {
        String versionKey = getVersionKey(recordId);
        String value = stringRedisTemplate.opsForValue().get(versionKey);
        if (value == null || value.isBlank()) {
            return 0L;
        }
        try {
            long version = Long.parseLong(value);
            if (version >= 0 && Long.toString(version).equals(value)) {
                return version;
            }
        } catch (NumberFormatException ex) {
            // 아래 복구 스크립트가 Redis의 현재 값을 다시 확인하고 원자적으로 교체한다.
        }

        Long recoveredVersion = stringRedisTemplate.execute(
            RECOVER_INVALID_VERSION_SCRIPT,
            List.of(versionKey),
            String.valueOf(COMMENT_VERSION_TTL.toSeconds()),
            value
        );
        if (recoveredVersion == null) {
            throw new IllegalStateException("댓글 캐시 version 복구 결과가 없습니다.");
        }
        log.warn(
            "Invalid comment cache version recovered: recordId={}, previousValue={}, recoveredVersion={}",
            recordId,
            value,
            recoveredVersion
        );
        return recoveredVersion;
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
