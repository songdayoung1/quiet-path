package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.auth.config.KakaoAuthProperties;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class KakaoUnlinkServiceTest {

    private static final String UNLINK_URI = "https://kapi.kakao.com/v1/user/unlink";

    private KakaoAuthProperties properties;
    private MockRestServiceServer server;
    private KakaoUnlinkService kakaoUnlinkService;

    @BeforeEach
    void setUp() {
        properties = new KakaoAuthProperties();
        properties.setAdminKey("test-admin-key");
        properties.setUnlinkUri(UNLINK_URI);
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        kakaoUnlinkService = new KakaoUnlinkService(properties, builder);
    }

    @Test
    void unlink_sendsAdminKeyAndKakaoUserId() {
        server.expect(once(), requestTo(UNLINK_URI))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "KakaoAK test-admin-key"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_FORM_URLENCODED))
            .andExpect(content().string("target_id_type=user_id&target_id=12345"))
            .andRespond(withSuccess("{\"id\":12345}", MediaType.APPLICATION_JSON));

        kakaoUnlinkService.unlink(User.createKakao("12345", "user@example.com", "사용자"));

        server.verify();
    }

    @Test
    void unlink_whenKakaoAccountIsAlreadyUnlinked_continuesWithdrawal() {
        server.expect(once(), requestTo(UNLINK_URI))
            .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"code\": -101, \"msg\":\"NotRegisteredUserException\"}"));

        assertDoesNotThrow(() ->
            kakaoUnlinkService.unlink(User.createKakao("12345", "user@example.com", "사용자"))
        );
        server.verify();
    }

    @Test
    void unlink_whenKakaoRequestFails_stopsWithdrawal() {
        server.expect(once(), requestTo(UNLINK_URI))
            .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        ApiException exception = assertThrows(
            ApiException.class,
            () -> kakaoUnlinkService.unlink(User.createKakao("12345", "user@example.com", "사용자"))
        );

        assertEquals(ErrorCode.KAKAO_UNLINK_FAILED, exception.getErrorCode());
        server.verify();
    }

    @Test
    void unlink_whenResponseUserIdDoesNotMatch_stopsWithdrawal() {
        server.expect(once(), requestTo(UNLINK_URI))
            .andRespond(withSuccess("{\"id\":99999}", MediaType.APPLICATION_JSON));

        ApiException exception = assertThrows(
            ApiException.class,
            () -> kakaoUnlinkService.unlink(User.createKakao("12345", "user@example.com", "사용자"))
        );

        assertEquals(ErrorCode.KAKAO_UNLINK_FAILED, exception.getErrorCode());
        server.verify();
    }

    @Test
    void unlink_forLocalQaAccount_doesNotCallKakao() {
        assertDoesNotThrow(() -> kakaoUnlinkService.unlink(User.createLocal("local-user", "로컬사용자")));

        server.verify();
    }

    @Test
    void unlink_withoutAdminKey_returnsConfigurationError() {
        properties.setAdminKey(" ");

        ApiException exception = assertThrows(
            ApiException.class,
            () -> kakaoUnlinkService.unlink(User.createKakao("12345", "user@example.com", "사용자"))
        );

        assertEquals(ErrorCode.AUTH_CONFIG_MISSING, exception.getErrorCode());
        server.verify();
    }
}
