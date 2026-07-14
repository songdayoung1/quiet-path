package kr.co.quietpath.api.auth.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.auth.refresh-cookie")
public class RefreshTokenCookieProperties {

    @NotBlank
    private String name = "refresh_token";

    @NotBlank
    private String path = "/api/v1/auth";

    @NotBlank
    private String sameSite = "Lax";

    private boolean secure = true;

    @PositiveOrZero
    private Long expirationSkewSeconds = 60L;
}
