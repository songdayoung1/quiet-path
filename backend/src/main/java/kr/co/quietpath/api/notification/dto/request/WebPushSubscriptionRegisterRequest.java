package kr.co.quietpath.api.notification.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WebPushSubscriptionRegisterRequest {

    @NotBlank
    @Size(max = 2048)
    private String endpoint;

    @Valid
    @NotNull
    private Keys keys;

    @Getter
    @Setter
    public static class Keys {

        @NotBlank
        @Size(max = 255)
        private String p256dh;

        @NotBlank
        @Size(max = 255)
        private String auth;
    }
}
