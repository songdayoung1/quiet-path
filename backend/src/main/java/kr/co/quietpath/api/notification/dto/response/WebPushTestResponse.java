package kr.co.quietpath.api.notification.dto.response;

public record WebPushTestResponse(
    int deliveredCount,
    int expiredCount,
    int failedCount
) {
}
