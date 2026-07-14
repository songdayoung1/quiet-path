package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.KakaoAuthProperties;
import kr.co.quietpath.api.auth.security.JwtTokenProvider;
import kr.co.quietpath.api.auth.service.result.AuthRefreshResult;
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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
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

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private AuthService authService;

    @Test
    void refresh_withoutToken_returns400() {
        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh(""));
        assertEquals(ErrorCode.REFRESH_TOKEN_REQUIRED, ex.getErrorCode());
    }

    @Test
    void refresh_missingSession_returns401() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any())).thenReturn(true);
        when(refreshTokenSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh("plain-refresh-token"));

        assertEquals(ErrorCode.REFRESH_TOKEN_INVALID, ex.getErrorCode());
    }

    @Test
    void refresh_rotatesRefreshTokenAndPersistsSession() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-old-token",
            300L
        );

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any())).thenReturn(true);
        when(refreshTokenSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(jwtProperties.getRefreshTokenTtlSeconds()).thenReturn(1_209_600L);
        when(jwtTokenProvider.createAccessToken(1L, "session-1")).thenReturn("new-access-token");

        AuthRefreshResult response = authService.refresh("plain-refresh-token");

        assertEquals("new-access-token", response.accessToken());
        assertTrue(response.refreshToken() != null && !response.refreshToken().isBlank());
        assertNotEquals("plain-refresh-token", response.refreshToken());
        assertNotEquals("hashed-old-token", session.getTokenHash());
        assertEquals(1_209_600L, session.getTtlSeconds());
        verify(refreshTokenSessionRepository).save(session);
        verify(jwtTokenProvider).createAccessToken(1L, "session-1");
        verify(stringRedisTemplate).delete(anyString());
    }

    @Test
    void refresh_whenRotationLockAlreadyHeld_returns401() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any())).thenReturn(false);

        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh("plain-refresh-token"));

        assertEquals(ErrorCode.REFRESH_TOKEN_INVALID, ex.getErrorCode());
        verify(refreshTokenSessionRepository, never()).findByTokenHash(anyString());
    }

    @Test
    void refresh_invalidTtl_throwsIllegalState() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-old-token",
            300L
        );

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any())).thenReturn(true);
        when(refreshTokenSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(jwtProperties.getRefreshTokenTtlSeconds()).thenReturn(0L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> authService.refresh("plain-refresh-token"));

        assertEquals("app.jwt.refresh-token-ttl-seconds는 0보다 커야 합니다.", ex.getMessage());
    }

    @Test
    void logout_deletesCurrentSession() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-old-token",
            300L
        );
        when(refreshTokenSessionRepository.findByTokenHash(anyString()))
            .thenReturn(Optional.of(session));

        boolean success = authService.logout("plain-refresh-token").isSuccess();

        assertTrue(success);
        verify(refreshTokenSessionRepository).delete(session);
    }

    @Test
    void logout_blankSessionId_doesNotLookupRepository() {
        boolean success = authService.logout(" ").isSuccess();

        assertTrue(success);
        verify(refreshTokenSessionRepository, never()).findByTokenHash(anyString());
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
