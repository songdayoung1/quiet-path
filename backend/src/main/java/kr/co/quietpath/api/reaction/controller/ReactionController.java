package kr.co.quietpath.api.reaction.controller;

import jakarta.validation.Valid;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.reaction.dto.request.ReactionCreateRequest;
import kr.co.quietpath.api.reaction.dto.request.ReactionDeleteRequest;
import kr.co.quietpath.api.reaction.dto.request.ReactionMeQuery;
import kr.co.quietpath.api.reaction.dto.response.ReactionCountResponse;
import kr.co.quietpath.api.reaction.dto.response.ReactionCreateResponse;
import kr.co.quietpath.api.reaction.dto.response.ReactionDeleteResponse;
import kr.co.quietpath.api.reaction.dto.response.ReactionMeResponse;
import kr.co.quietpath.api.reaction.service.ReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reactions")
public class ReactionController {

    private final ReactionService reactionService;

    @PostMapping
    public ResponseEntity<ReactionCreateResponse> createReaction(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ReactionCreateRequest request
    ) {
        Long userId = extractUserId(principal);
        ReactionCreateResponse response = reactionService.createReaction(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping
    public ReactionDeleteResponse deleteReaction(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ReactionDeleteRequest request
    ) {
        Long userId = extractUserId(principal);
        return reactionService.deleteReaction(userId, request);
    }

    @GetMapping("/me")
    public ReactionMeResponse getMyReaction(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @ModelAttribute ReactionMeQuery query
    ) {
        Long userId = extractUserId(principal);
        return reactionService.getMyReaction(userId, query);
    }

    @GetMapping("/count")
    public ReactionCountResponse getReactionCount(
        @Valid @ModelAttribute ReactionMeQuery query
    ) {
        return reactionService.getReactionCount(query);
    }

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return principal.getUserId();
    }
}
