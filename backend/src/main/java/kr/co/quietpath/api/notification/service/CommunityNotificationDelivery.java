package kr.co.quietpath.api.notification.service;

public record CommunityNotificationDelivery(
    Long recipientUserId,
    WebPushPayload payload
) {
}
