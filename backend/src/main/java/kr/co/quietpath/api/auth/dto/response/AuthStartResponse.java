package kr.co.quietpath.api.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthStartResponse {
    private String redirectUrl;
}
