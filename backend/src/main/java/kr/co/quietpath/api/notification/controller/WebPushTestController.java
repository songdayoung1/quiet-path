package kr.co.quietpath.api.notification.controller;

import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.notification.dto.response.WebPushTestResponse;
import kr.co.quietpath.api.notification.service.WebPushDeliveryReport;
import kr.co.quietpath.api.notification.service.WebPushDeliveryService;
import kr.co.quietpath.api.notification.service.WebPushPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Profile("local")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications/push")
public class WebPushTestController {

    private final WebPushDeliveryService webPushDeliveryService;

    @PostMapping("/test")
    public WebPushTestResponse sendTestPush(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }

        WebPushDeliveryReport report = webPushDeliveryService.sendToUserDetailed(
            principal.getUserId(),
            new WebPushPayload(
                "QUIET PATH 테스트",
                "브라우저 푸시 알림이 정상적으로 연결됐어요.",
                "/",
                "quiet-path-local-test"
            )
        );
        return new WebPushTestResponse(
            report.deliveredCount(),
            report.expiredCount(),
            report.failedCount()
        );
    }
}
