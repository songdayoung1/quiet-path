package kr.co.quietpath.api.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WebPushSubscriptionDeleteRequest {

    @NotBlank
    @Size(max = 2048)
    private String endpoint;
}
