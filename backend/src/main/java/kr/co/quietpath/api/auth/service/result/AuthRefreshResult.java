package kr.co.quietpath.api.auth.service.result;

public record AuthRefreshResult(
    String accessToken,
    String refreshToken
) {
}
