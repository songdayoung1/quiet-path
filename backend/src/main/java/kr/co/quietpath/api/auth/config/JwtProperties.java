package kr.co.quietpath.api.auth.config;

import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    private String secret;

    @Positive
    private Long accessTokenTtlSeconds = 1_209_600L;

    @Positive
    private Long refreshTokenTtlSeconds = 15_552_000L;

    private String issuer = "quiet-path";
}
