package kr.co.quietpath.api.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "kakao.auth")
public class KakaoAuthProperties {
    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String authorizeUri = "https://kauth.kakao.com/oauth/authorize";
    private String tokenUri = "https://kauth.kakao.com/oauth/token";
    private String userInfoUri = "https://kapi.kakao.com/v2/user/me";
}

