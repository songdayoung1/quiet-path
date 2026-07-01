package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.api.comment.dto.request.CommentCreateRequest;
import kr.co.quietpath.api.comment.dto.request.CommentListQuery;
import kr.co.quietpath.api.comment.dto.request.CommentUpdateRequest;
import kr.co.quietpath.api.comment.dto.response.CommentCreateResponse;
import kr.co.quietpath.api.comment.dto.response.CommentDeleteResponse;
import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.api.comment.dto.response.CommentUpdateResponse;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.domain.comment.entity.Comment;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;
    private final CommentRepository commentRepository;
    private final RecordRepository recordRepository;
    private final UserRepository userRepository;
    private final WeeklyTop3CacheService weeklyTop3CacheService;
    private final CommentPageCacheService commentPageCacheService;

    // 댓글 생성 후 댓글 목록 캐시와 주간 Top3 캐시를 함께 비운다.
    // 댓글 수와 Top3 댓글 수 집계가 둘 다 바뀔 수 있기 때문이다.
    @Transactional
    public CommentCreateResponse createComment(Long userId, CommentCreateRequest request) {
        Record record = getRecord(request.getRecordId());
        validatePublic(record);
        getUser(userId);

        Comment comment = Comment.builder()
            .recordId(request.getRecordId())
            .userId(userId)
            .content(request.getContent())
            .build();

        commentRepository.save(comment);
        long commentCount = commentRepository.countByRecordIdAndDeletedFalse(comment.getRecordId());
        commentPageCacheService.evictRecord(comment.getRecordId());
        weeklyTop3CacheService.evict();

        return CommentCreateResponse.builder()
            .commentId(comment.getId())
            .recordId(comment.getRecordId())
            .userId(comment.getUserId())
            .content(comment.getContent())
            .commentCount(commentCount)
            .deleted(comment.isDeleted())
            .createdAt(formatDateTime(comment.getCreatedAt()))
            .build();
    }

    // 공개 여부 검증을 먼저 통과한 뒤에만 댓글 캐시를 조회한다.
    // 이 순서를 지켜야 PUBLIC -> PRIVATE 전환 후 stale 캐시가 새지 않는다.
    @Transactional(readOnly = true)
    public CommentListResponse getComments(CommentListQuery query) {
        Record record = getRecord(query.getRecordId());
        validatePublic(record);

        int page = normalizePage(query.getPage());
        int size = normalizeSize(query.getSize());
        return commentPageCacheService.getComments(query.getRecordId(), page, size);
    }

    // 수정은 댓글 수는 그대로지만 목록 내용이 바뀌므로 해당 record 캐시만 비운다.
    @Transactional
    public CommentUpdateResponse updateComment(Long userId, Long commentId, CommentUpdateRequest request) {
        Comment comment = getComment(commentId);
        validateOwner(userId, comment);
        comment.updateContent(request.getContent());
        long commentCount = commentRepository.countByRecordIdAndDeletedFalse(comment.getRecordId());
        commentPageCacheService.evictRecord(comment.getRecordId());

        return CommentUpdateResponse.builder()
            .commentId(comment.getId())
            .recordId(comment.getRecordId())
            .commentCount(commentCount)
            .content(comment.getContent())
            .updatedAt(formatDateTime(comment.getUpdatedAt()))
            .build();
    }

    // soft delete 후에는 활성 댓글 수와 Top3 댓글 수 집계가 모두 달라질 수 있다.
    @Transactional
    public CommentDeleteResponse deleteComment(Long userId, Long commentId) {
        Comment comment = getComment(commentId);
        validateOwner(userId, comment);
        comment.softDelete();
        long commentCount = commentRepository.countByRecordIdAndDeletedFalse(comment.getRecordId());
        commentPageCacheService.evictRecord(comment.getRecordId());
        weeklyTop3CacheService.evict();

        return CommentDeleteResponse.builder()
            .commentId(comment.getId())
            .recordId(comment.getRecordId())
            .commentCount(commentCount)
            .deleted(comment.isDeleted())
            .deletedAt(comment.getDeletedAt() != null ? formatDateTime(comment.getDeletedAt()) : null)
            .build();
    }

    private Record getRecord(Long recordId) {
        return recordRepository.findByIdAndIsHiddenFalse(recordId)
            .orElseThrow(() -> new ApiException(ErrorCode.TARGET_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private Comment getComment(Long commentId) {
        return commentRepository.findById(commentId)
            .orElseThrow(() -> new ApiException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private void validatePublic(Record record) {
        if (!VISIBILITY_PUBLIC.equals(record.getVisibility())) {
            throw new ApiException(ErrorCode.TARGET_NOT_PUBLIC);
        }
    }

    private void validateOwner(Long userId, Comment comment) {
        if (!comment.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
    }

    // 외부 입력값을 캐시 키와 DB 조회 기준으로 바로 쓰지 않도록 size를 정규화한다.
    private int normalizeSize(Integer size) {
        if (size == null || size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    // 음수 페이지 요청은 모두 첫 페이지로 보정한다.
    private int normalizePage(Integer page) {
        if (page == null || page < 0) {
            return 0;
        }
        return page;
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
