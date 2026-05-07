package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.KakaoAuthProperties;
import kr.co.quietpath.api.auth.dto.response.AuthRefreshResponse;
import kr.co.quietpath.api.auth.security.JwtTokenProvider;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.domain.auth.entity.RefreshTokenSession;
import kr.co.quietpath.domain.auth.repository.RefreshTokenSessionRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenSessionRepository refreshTokenSessionRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private JwtProperties jwtProperties;

    @Mock
    private KakaoAuthProperties kakaoAuthProperties;

    @InjectMocks
    private AuthService authService;

    @Test
    void refresh_withoutToken_returns400() {
        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh(""));
        assertEquals(ErrorCode.REFRESH_TOKEN_REQUIRED, ex.getErrorCode());
    }

    @Test
    void refresh_revokedToken_returns401() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-old-token",
            LocalDateTime.now().plusMinutes(30)
        );
        session.revoke();

        when(refreshTokenSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));

        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh("plain-refresh-token"));
        assertEquals(ErrorCode.REFRESH_TOKEN_INVALID, ex.getErrorCode());
    }

    @Test
    void refresh_expiredToken_revokesAndReturns401() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-old-token",
            LocalDateTime.now().minusSeconds(1)
        );

        when(refreshTokenSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));

        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh("plain-refresh-token"));
        assertEquals(ErrorCode.REFRESH_TOKEN_EXPIRED, ex.getErrorCode());
        assertTrue(session.isRevoked());
    }

    @Test
    void refresh_rotatesRefreshTokenAndIssuesAccessToken() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-old-token",
            LocalDateTime.now().plusMinutes(30)
        );

        when(refreshTokenSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(jwtProperties.getRefreshTokenTtlSeconds()).thenReturn(1_209_600L);
        when(jwtTokenProvider.createAccessToken(1L, "session-1")).thenReturn("new-access-token");

        AuthRefreshResponse response = authService.refresh("plain-refresh-token");

        assertEquals("new-access-token", response.getToken());
        assertTrue(response.getRefreshToken() != null && !response.getRefreshToken().isBlank());
        assertNotEquals("plain-refresh-token", response.getRefreshToken());
        assertNotEquals("hashed-old-token", session.getTokenHash());
        assertFalse(session.isRevoked());
        verify(jwtTokenProvider).createAccessToken(1L, "session-1");
    }

    @Test
    void logout_revokesCurrentSession() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-old-token",
            LocalDateTime.now().plusMinutes(30)
        );
        when(refreshTokenSessionRepository.findByUserIdAndSessionId(1L, "session-1"))
            .thenReturn(Optional.of(session));

        boolean success = authService.logout(1L, "session-1").isSuccess();

        assertTrue(success);
        assertTrue(session.isRevoked());
    }

    @Test
    void updateNickname_invalidFormat_returns400() {
        User user = User.createKakao("provider-user", "user@quietpath.co.kr", "기존닉네임");
        setId(user, 1L);

        ApiException ex = assertThrows(ApiException.class, () -> authService.updateNickname(1L, "ab!"));
        assertEquals(ErrorCode.INVALID_NICKNAME_FORMAT, ex.getErrorCode());
    }

    @Test
    void updateNickname_duplicate_returns409() {
        User user = User.createKakao("provider-user", "user@quietpath.co.kr", "기존닉네임");
        setId(user, 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname("중복닉네임")).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> authService.updateNickname(1L, "중복닉네임"));
        assertEquals(ErrorCode.NICKNAME_ALREADY_EXISTS, ex.getErrorCode());
    }

    @Test
    void updateNickname_trimmedNickname_updatesUser() {
        User user = User.createKakao("provider-user", "user@quietpath.co.kr", "기존닉네임");
        setId(user, 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname("새닉네임12")).thenReturn(false);

        String nickname = authService.updateNickname(1L, "  새닉네임12 ").getNickname();

        assertEquals("새닉네임12", nickname);
        assertEquals("새닉네임12", user.getNickname());
    }

    private void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (Exception e) {
            throw new IllegalStateException("테스트 데이터 id 설정 실패", e);
        }
    }
}
