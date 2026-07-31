package kr.co.quietpath.api.notification.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.notification.dto.request.NotificationListQuery;
import kr.co.quietpath.api.notification.dto.request.NotificationPreferenceUpdateRequest;
import kr.co.quietpath.api.notification.dto.request.WebPushSubscriptionDeleteRequest;
import kr.co.quietpath.api.notification.dto.request.WebPushSubscriptionRegisterRequest;
import kr.co.quietpath.api.notification.dto.response.NotificationListResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationPreferenceResponse;
import kr.co.quietpath.api.notification.dto.response.WebPushConfigResponse;
import kr.co.quietpath.api.notification.dto.response.WebPushSubscriptionResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationReadAllResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationReadResponse;
import kr.co.quietpath.api.notification.dto.response.NotificationUnreadCountResponse;
import kr.co.quietpath.api.notification.service.NotificationService;
import kr.co.quietpath.api.notification.service.NotificationPreferenceService;
import kr.co.quietpath.api.notification.service.WebPushSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
@Validated
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationPreferenceService notificationPreferenceService;
    private final WebPushSubscriptionService webPushSubscriptionService;

    @GetMapping("/preferences")
    public NotificationPreferenceResponse getPreference(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return notificationPreferenceService.getPreference(extractUserId(principal));
    }

    @PutMapping("/preferences")
    public NotificationPreferenceResponse updatePreference(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody NotificationPreferenceUpdateRequest request
    ) {
        return notificationPreferenceService.updatePreference(extractUserId(principal), request);
    }

    @GetMapping("/push/config")
    public WebPushConfigResponse getWebPushConfig(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        extractUserId(principal);
        return webPushSubscriptionService.getConfig();
    }

    @PostMapping("/push/subscriptions")
    public WebPushSubscriptionResponse register(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody WebPushSubscriptionRegisterRequest request,
        @RequestHeader(value = "User-Agent", required = false) String userAgent
    ) {
        return webPushSubscriptionService.register(extractUserId(principal), request, userAgent);
    }

    @DeleteMapping("/push/subscriptions")
    public WebPushSubscriptionResponse unsubscribe(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody WebPushSubscriptionDeleteRequest request
    ) {
        return webPushSubscriptionService.unsubscribe(extractUserId(principal), request);
    }

    @GetMapping
    public NotificationListResponse getNotifications(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @ModelAttribute NotificationListQuery query
    ) {
        Long userId = extractUserId(principal);
        return notificationService.getNotifications(userId, query);
    }

    @GetMapping("/unread-count")
    public NotificationUnreadCountResponse getUnreadCount(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return notificationService.getUnreadCount(extractUserId(principal));
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
