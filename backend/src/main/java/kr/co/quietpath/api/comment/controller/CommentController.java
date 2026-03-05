package kr.co.quietpath.api.comment.controller;

import jakarta.validation.Valid;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.comment.dto.request.CommentCreateRequest;
import kr.co.quietpath.api.comment.dto.request.CommentListQuery;
import kr.co.quietpath.api.comment.dto.request.CommentUpdateRequest;
import kr.co.quietpath.api.comment.dto.response.CommentCreateResponse;
import kr.co.quietpath.api.comment.dto.response.CommentDeleteResponse;
import kr.co.quietpath.api.comment.dto.response.CommentListResponse;
import kr.co.quietpath.api.comment.dto.response.CommentUpdateResponse;
import kr.co.quietpath.api.comment.service.CommentService;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/comments")
@Validated
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentCreateResponse> createComment(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CommentCreateRequest request
    ) {
        Long userId = extractUserId(principal);
        CommentCreateResponse response = commentService.createComment(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public CommentListResponse getComments(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @ModelAttribute CommentListQuery query
    ) {
        extractUserId(principal);
        return commentService.getComments(query);
    }

    @PutMapping("/{commentId}")
    public CommentUpdateResponse updateComment(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long commentId,
        @Valid @RequestBody CommentUpdateRequest request
    ) {
        Long userId = extractUserId(principal);
        return commentService.updateComment(userId, commentId, request);
    }

    @DeleteMapping("/{commentId}")
    public CommentDeleteResponse deleteComment(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long commentId
    ) {
        Long userId = extractUserId(principal);
        return commentService.deleteComment(userId, commentId);
    }

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return principal.getUserId();
    }
}
