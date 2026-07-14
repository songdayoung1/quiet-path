package kr.co.quietpath.api.path.controller;

import jakarta.validation.Valid;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.request.PathCreateRequest;
import kr.co.quietpath.api.path.dto.request.PathReviewExtendRequest;
import kr.co.quietpath.api.path.dto.response.*;
import kr.co.quietpath.api.path.service.PathService;
import kr.co.quietpath.api.summary.service.PathSummaryCommandService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/paths")
public class PathController {

    private final PathService pathService;
    private final PathSummaryCommandService pathSummaryCommandService;

    @GetMapping("/active")
    public PathActiveResponse getActivePath(@AuthenticationPrincipal UserPrincipal principal) {
        Long userId = extractUserId(principal);
        return pathService.getActivePath(userId);
    }

    @PostMapping
    public PathCreateResponse createPath(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody PathCreateRequest request
    ) {
        Long userId = extractUserId(principal);
        return pathService.createPath(userId, request);
    }

    @PostMapping("/{pathId}/finish")
    public PathFinishResponse finishPath(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long pathId
    ) {
        Long userId = extractUserId(principal);
        return pathService.finishPath(userId, pathId);
    }

    @PatchMapping("/{pathId}/review-at")
    public PathReviewExtendResponse extendReviewAt(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long pathId,
        @RequestBody PathReviewExtendRequest request
    ) {
        Long userId = extractUserId(principal);
        return pathService.extendReviewAt(userId, pathId, request);
    }

    @GetMapping
    public PathListResponse getPastPaths(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam String status,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String cursor
    ) {
        if (!"FINISHED".equals(status)) {
            throw new ApiException(ErrorCode.INVALID_STATUS);
        }
        Long userId = extractUserId(principal);
        return pathService.getPastPaths(userId, cursor, size);
    }

    @GetMapping("/{pathId}")
    public PathDetailResponse getPathDetail(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long pathId
    ) {
        Long userId = extractUserId(principal);
        return pathService.getPathDetail(userId, pathId);
    }

    @PostMapping("/{pathId}/summary")
    public PathSummaryStartResponse requestSummary(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long pathId
    ) {
        Long userId = extractUserId(principal);
        return pathSummaryCommandService.requestSummary(userId, pathId);
    }

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return principal.getUserId();
    }
}
