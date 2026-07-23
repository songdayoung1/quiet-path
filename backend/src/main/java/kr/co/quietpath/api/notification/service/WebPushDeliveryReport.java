package kr.co.quietpath.api.notification.service;

public record WebPushDeliveryReport(
    int deliveredCount,
    int expiredCount,
    int failedCount
) {
}
