package kr.co.quietpath.api.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthWithdrawalResponse {
    private boolean success;
}
