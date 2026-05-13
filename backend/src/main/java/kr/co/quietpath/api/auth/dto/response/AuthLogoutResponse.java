package kr.co.quietpath.api.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthLogoutResponse {
    private boolean success;
}

