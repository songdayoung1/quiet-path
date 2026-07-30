package kr.co.quietpath.api.notification.service;

public record CommunityNotificationRequestedEvent(
    CommunityNotificationType type,
    Long sourceId,
    Long recipientUserId,
    Long actorUserId,
    String actorNickname,
    Long recordId
) {
}
