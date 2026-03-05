package kr.co.quietpath.api.notification.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.notification.dto.request.NotificationListQuery;
import kr.co.quietpath.api.notification.dto.response.NotificationListResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationReadAllResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationReadResponse;
import kr.co.quietpath.api.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
@Validated
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public NotificationListResponse getNotifications(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @ModelAttribute NotificationListQuery query
    ) {
        Long userId = extractUserId(principal);
        return notificationService.getNotifications(userId, query);
    }

    @PatchMapping("/{notificationId}/read")
    public NotificationReadResponse readNotification(
        @AuthenticationPrincipal UserPrincipal principal,
        @Positive @PathVariable Long notificationId
    ) {
        Long userId = extractUserId(principal);
        return notificationService.readNotification(userId, notificationId);
    }

    @PatchMapping("/read-all")
    public NotificationReadAllResponse readAll(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = extractUserId(principal);
        return notificationService.readAll(userId);
    }

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return principal.getUserId();
    }
}
