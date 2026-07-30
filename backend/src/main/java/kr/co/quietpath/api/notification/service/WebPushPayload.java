package kr.co.quietpath.api.notification.service;

public record WebPushPayload(
    String title,
    String body,
    String url,
    String tag
) {
}
