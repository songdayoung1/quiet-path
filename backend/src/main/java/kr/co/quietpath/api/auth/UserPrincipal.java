package kr.co.quietpath.api.auth;

import lombok.Getter;

@Getter
public class UserPrincipal {
    private final Long userId;
    private final String sessionId;

    public UserPrincipal(Long userId) {
        this(userId, null);
    }

    public UserPrincipal(Long userId, String sessionId) {
        this.userId = userId;
        this.sessionId = sessionId;
    }
}
