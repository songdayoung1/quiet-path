package kr.co.quietpath.api.comment.service;

import kr.co.quietpath.api.comment.dto.request.CommentCreateRequest;
import kr.co.quietpath.api.comment.dto.request.CommentListQuery;
import kr.co.quietpath.api.comment.dto.request.CommentUpdateRequest;
import kr.co.quietpath.api.comment.dto.response.CommentCreateResponse;
import kr.co.quietpath.api.comment.dto.response.CommentDeleteResponse;
import kr.co.quietpath.api.comment.dto.response.CommentListItem;
import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.api.comment.dto.response.CommentUpdateResponse;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.domain.comment.entity.Comment;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final String TARGET_RECORD = "RECORD";
    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;
    private static final String DELETED_CONTENT = "삭제된 댓글입니다";

    private final CommentRepository commentRepository;
    private final RecordRepository recordRepository;
    private final UserRepository userRepository;

    @Transactional
    public CommentCreateResponse createComment(Long userId, CommentCreateRequest request) {
        validateTargetType(request.getTargetType());
        Record record = getRecord(request.getTargetId());
        validatePublic(record);
        getUser(userId);

        Comment comment = Comment.builder()
            .targetType(request.getTargetType())
            .targetId(request.getTargetId())
            .userId(userId)
            .content(request.getContent())
            .build();

        commentRepository.save(comment);

        return CommentCreateResponse.builder()
            .commentId(comment.getId())
            .targetType(comment.getTargetType())
            .targetId(comment.getTargetId())
            .userId(comment.getUserId())
            .content(comment.getContent())
            .deleted(comment.isDeleted())
            .createdAt(formatDateTime(comment.getCreatedAt()))
            .build();
    }

    @Transactional(readOnly = true)
    public CommentListResponse getComments(CommentListQuery query) {
        validateTargetType(query.getTargetType());
        Record record = getRecord(query.getTargetId());
        validatePublic(record);

        int page = query.getPage() != null && query.getPage() >= 0 ? query.getPage() : 0;
        int size = normalizeSize(query.getSize());

        Page<Comment> commentPage = commentRepository.findByTargetTypeAndTargetIdOrderByCreatedAtAsc(
            query.getTargetType(),
            query.getTargetId(),
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
                    .content(comment.isDeleted() ? DELETED_CONTENT : comment.getContent())
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

    @Transactional
    public CommentUpdateResponse updateComment(Long userId, Long commentId, CommentUpdateRequest request) {
        Comment comment = getComment(commentId);
        validateOwner(userId, comment);
        comment.updateContent(request.getContent());

        return CommentUpdateResponse.builder()
            .commentId(comment.getId())
            .content(comment.getContent())
            .updatedAt(formatDateTime(comment.getUpdatedAt()))
            .build();
    }

    @Transactional
    public CommentDeleteResponse deleteComment(Long userId, Long commentId) {
        Comment comment = getComment(commentId);
        validateOwner(userId, comment);
        comment.softDelete();

        return CommentDeleteResponse.builder()
            .commentId(comment.getId())
            .deleted(comment.isDeleted())
            .deletedAt(comment.getDeletedAt() != null ? formatDateTime(comment.getDeletedAt()) : null)
            .build();
    }

    private void validateTargetType(String targetType) {
        if (!TARGET_RECORD.equals(targetType)) {
            throw new ApiException(ErrorCode.INVALID_TARGET_TYPE);
        }
    }

    private Record getRecord(Long recordId) {
        return recordRepository.findById(recordId)
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

    private int normalizeSize(Integer size) {
        if (size == null || size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
