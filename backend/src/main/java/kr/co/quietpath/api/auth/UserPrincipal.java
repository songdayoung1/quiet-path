package kr.co.quietpath.api.auth;

import lombok.Getter;

@Getter
public class UserPrincipal {
    private final Long userId;

    public UserPrincipal(Long userId) {
        this.userId = userId;
    }
}
