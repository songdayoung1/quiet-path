package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.auth.config.KakaoAuthProperties;
import kr.co.quietpath.api.auth.dto.kakao.KakaoUnlinkResponse;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.domain.user.entity.ProviderType;
import kr.co.quietpath.domain.user.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.regex.Pattern;

@Slf4j
@Service
public class KakaoUnlinkService {

    private static final String KAKAO_ADMIN_AUTH_PREFIX = "KakaoAK ";
    private static final String TARGET_ID_TYPE_USER_ID = "user_id";
    private static final Pattern ALREADY_UNLINKED_ERROR = Pattern.compile("\\\"code\\\"\\s*:\\s*-101");

    private final KakaoAuthProperties properties;
    private final RestClient restClient;

    @Autowired
    public KakaoUnlinkService(KakaoAuthProperties properties) {
        this(properties, RestClient.builder());
    }

    KakaoUnlinkService(KakaoAuthProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    public void unlink(User user) {
        if (user.getProvider() != ProviderType.KAKAO) {
            return;
        }
        validateConfiguration();

        Long kakaoUserId = parseKakaoUserId(user.getProviderUserId());
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("target_id_type", TARGET_ID_TYPE_USER_ID);
        form.add("target_id", kakaoUserId.toString());

        try {
            KakaoUnlinkResponse response = restClient.post()
                .uri(properties.getUnlinkUri())
                .header(HttpHeaders.AUTHORIZATION, KAKAO_ADMIN_AUTH_PREFIX + properties.getAdminKey())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(KakaoUnlinkResponse.class);

            if (response == null || !kakaoUserId.equals(response.getId())) {
                throw new ApiException(ErrorCode.KAKAO_UNLINK_FAILED);
            }
        } catch (RestClientResponseException exception) {
            if (isAlreadyUnlinked(exception)) {
                log.info("Kakao account is already unlinked. kakaoUserId={}", kakaoUserId);
                return;
            }
            log.warn("Kakao unlink failed. status={}, kakaoUserId={}", exception.getStatusCode(), kakaoUserId);
            throw new ApiException(ErrorCode.KAKAO_UNLINK_FAILED);
        } catch (RestClientException exception) {
            log.warn("Kakao unlink failed without an HTTP response. kakaoUserId={}", kakaoUserId, exception);
            throw new ApiException(ErrorCode.KAKAO_UNLINK_FAILED);
        }
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(properties.getAdminKey()) || !StringUtils.hasText(properties.getUnlinkUri())) {
            throw new ApiException(
                ErrorCode.AUTH_CONFIG_MISSING,
                "카카오 연결 해제를 위한 관리자 키 설정이 누락되었습니다."
            );
        }
    }

    private Long parseKakaoUserId(String providerUserId) {
        try {
            return Long.valueOf(providerUserId);
        } catch (NumberFormatException exception) {
            throw new ApiException(ErrorCode.KAKAO_UNLINK_FAILED);
        }
    }

    private boolean isAlreadyUnlinked(RestClientResponseException exception) {
        return exception.getStatusCode().value() == 400
            && ALREADY_UNLINKED_ERROR.matcher(exception.getResponseBodyAsString()).find();
    }
}
