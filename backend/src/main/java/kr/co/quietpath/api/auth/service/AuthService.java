package kr.co.quietpath.api.auth.service;

import kr.co.quietpath.api.auth.config.JwtProperties;
import kr.co.quietpath.api.auth.config.KakaoAuthProperties;
import kr.co.quietpath.api.auth.dto.OnboardingStatus;
import kr.co.quietpath.api.auth.dto.kakao.KakaoTokenResponse;
import kr.co.quietpath.api.auth.dto.kakao.KakaoUserResponse;
import kr.co.quietpath.api.auth.dto.response.AuthCallbackResponse;
import kr.co.quietpath.api.auth.dto.response.AuthLogoutResponse;
import kr.co.quietpath.api.auth.dto.response.AuthMeResponse;
import kr.co.quietpath.api.auth.dto.response.AuthRefreshResponse;
import kr.co.quietpath.api.auth.security.JwtTokenProvider;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.domain.auth.entity.RefreshTokenSession;
import kr.co.quietpath.domain.auth.repository.RefreshTokenSessionRepository;
import kr.co.quietpath.domain.user.entity.ProviderType;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private static final String AUTHORIZATION_CODE = "authorization_code";
    private static final String RESPONSE_TYPE_CODE = "code";
    private static final List<String> NICKNAME_STEMS = List.of(
        "조용한물결빛",
        "고요한새벽숲",
        "느린바람결빛",
        "잔잔한푸른밤",
        "포근한하늘빛",
        "맑아진호수빛"
    );
    private static final int NICKNAME_MAX_ATTEMPTS = 40;
    private static final int NICKNAME_MIN_LENGTH = 2;
    private static final int NICKNAME_MAX_LENGTH = 12;
    private static final Pattern NICKNAME_PATTERN = Pattern.compile("^[A-Za-z0-9가-힣]+$");
    private static final int REFRESH_TOKEN_RANDOM_BYTES = 32;
    private static final String SHA_256 = "SHA-256";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenSessionRepository refreshTokenSessionRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final KakaoAuthProperties kakaoAuthProperties;
    private final RestClient restClient = RestClient.builder().build();

    @Transactional(readOnly = true)
    public String buildKakaoAuthorizeUrl() {
        validateKakaoAuthConfig();
        return UriComponentsBuilder
            .fromUriString(kakaoAuthProperties.getAuthorizeUri())
            .queryParam("response_type", RESPONSE_TYPE_CODE)
            .queryParam("client_id", kakaoAuthProperties.getClientId())
            .queryParam("redirect_uri", kakaoAuthProperties.getRedirectUri())
            .toUriString();
    }

    public AuthCallbackResponse loginWithKakaoCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        validateKakaoAuthConfig();

        KakaoTokenResponse kakaoToken = requestKakaoToken(code);
        KakaoUserResponse kakaoUser = requestKakaoUser(kakaoToken.getAccessToken());

        if (kakaoUser.getId() == null) {
            throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
        }

        String providerUserId = String.valueOf(kakaoUser.getId());
        String email = kakaoUser.getEmail();

        OnboardingStatus onboardingStatus;
        User user = userRepository.findByProviderAndProviderUserId(ProviderType.KAKAO, providerUserId)
            .orElse(null);

        if (user == null) {
            user = User.createKakao(providerUserId, email, generateUniqueNickname());
            user.updateLastLogin();
            userRepository.save(user);
            onboardingStatus = OnboardingStatus.NEW;
        } else {
            if (StringUtils.hasText(email) && !email.equals(user.getEmail())) {
                user.updateEmail(email);
            }
            user.updateLastLogin();
            onboardingStatus = OnboardingStatus.EXISTING;
        }

        String sessionId = UUID.randomUUID().toString();
        String appAccessToken = jwtTokenProvider.createAccessToken(user.getId(), sessionId);
        String appRefreshToken = issueRefreshToken(user.getId(), sessionId);
        return AuthCallbackResponse.builder()
            .token(appAccessToken)
            .refreshToken(appRefreshToken)
            .onboardingStatus(onboardingStatus)
            .build();
    }

    @Transactional(readOnly = true)
    public AuthMeResponse getMe(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        return AuthMeResponse.builder()
            .id(user.getId())
            .nickname(user.getNickname())
            .onboardingStatus(OnboardingStatus.EXISTING)
            .build();
    }

    public AuthRefreshResponse refresh(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            throw new ApiException(ErrorCode.REFRESH_TOKEN_REQUIRED);
        }

        RefreshTokenSession session = refreshTokenSessionRepository.findByTokenHash(hashToken(refreshToken))
            .orElseThrow(() -> new ApiException(ErrorCode.REFRESH_TOKEN_INVALID));

        LocalDateTime now = LocalDateTime.now();
        if (session.isRevoked()) {
            throw new ApiException(ErrorCode.REFRESH_TOKEN_INVALID);
        }
        if (session.isExpired(now)) {
            session.revoke();
            throw new ApiException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        String rotatedRefreshToken = generateOpaqueRefreshToken();
        session.rotate(
            hashToken(rotatedRefreshToken),
            now.plusSeconds(jwtProperties.getRefreshTokenTtlSeconds())
        );
        String newAccessToken = jwtTokenProvider.createAccessToken(session.getUserId(), session.getSessionId());

        return AuthRefreshResponse.builder()
            .token(newAccessToken)
            .refreshToken(rotatedRefreshToken)
            .build();
    }

    public AuthLogoutResponse logout(Long userId, String sessionId) {
        if (StringUtils.hasText(sessionId)) {
            refreshTokenSessionRepository.findByUserIdAndSessionId(userId, sessionId)
                .ifPresent(RefreshTokenSession::revoke);
        }
        return AuthLogoutResponse.builder()
            .success(true)
            .build();
    }

    public AuthMeResponse updateNickname(Long userId, String nickname) {
        String normalizedNickname = normalizeNickname(nickname);
        if (!isValidNickname(normalizedNickname)) {
            throw new ApiException(ErrorCode.INVALID_NICKNAME_FORMAT);
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        if (!normalizedNickname.equals(user.getNickname()) && userRepository.existsByNickname(normalizedNickname)) {
            throw new ApiException(ErrorCode.NICKNAME_ALREADY_EXISTS);
        }

        user.updateNickname(normalizedNickname);

        return AuthMeResponse.builder()
            .id(user.getId())
            .nickname(user.getNickname())
            .onboardingStatus(OnboardingStatus.EXISTING)
            .build();
    }

    private KakaoTokenResponse requestKakaoToken(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", AUTHORIZATION_CODE);
        form.add("client_id", kakaoAuthProperties.getClientId());
        form.add("redirect_uri", kakaoAuthProperties.getRedirectUri());
        form.add("code", code);
        if (StringUtils.hasText(kakaoAuthProperties.getClientSecret())) {
            form.add("client_secret", kakaoAuthProperties.getClientSecret());
        }

        try {
            KakaoTokenResponse response = restClient.post()
                .uri(kakaoAuthProperties.getTokenUri())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(KakaoTokenResponse.class);

            if (response == null || !StringUtils.hasText(response.getAccessToken())) {
                throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
            }
            return response;
        } catch (RestClientException ex) {
            throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
        }
    }

    private KakaoUserResponse requestKakaoUser(String accessToken) {
        if (!StringUtils.hasText(accessToken)) {
            throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
        }
        try {
            KakaoUserResponse response = restClient.get()
                .uri(kakaoAuthProperties.getUserInfoUri())
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .body(KakaoUserResponse.class);

            if (response == null) {
                throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
            }
            return response;
        } catch (RestClientException ex) {
            throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
        }
    }

    private String generateUniqueNickname() {
        for (int i = 0; i < NICKNAME_MAX_ATTEMPTS; i++) {
            String stem = NICKNAME_STEMS.get(ThreadLocalRandom.current().nextInt(NICKNAME_STEMS.size()));
            int number = ThreadLocalRandom.current().nextInt(10_000);
            String candidate = stem + String.format("%04d", number);
            if (!userRepository.existsByNickname(candidate)) {
                return candidate;
            }
        }
        throw new ApiException(ErrorCode.NICKNAME_GENERATION_FAILED);
    }

    private String normalizeNickname(String nickname) {
        return nickname == null ? "" : nickname.trim();
    }

    private boolean isValidNickname(String nickname) {
        if (!StringUtils.hasText(nickname)) {
            return false;
        }
        int length = nickname.length();
        if (length < NICKNAME_MIN_LENGTH || length > NICKNAME_MAX_LENGTH) {
            return false;
        }
        return NICKNAME_PATTERN.matcher(nickname).matches();
    }

    private String issueRefreshToken(Long userId, String sessionId) {
        String refreshToken = generateOpaqueRefreshToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(jwtProperties.getRefreshTokenTtlSeconds());
        refreshTokenSessionRepository.save(
            RefreshTokenSession.issue(userId, sessionId, hashToken(refreshToken), expiresAt)
        );
        return refreshToken;
    }

    private String generateOpaqueRefreshToken() {
        byte[] randomBytes = new byte[REFRESH_TOKEN_RANDOM_BYTES];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance(SHA_256);
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte value : hash) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("지원하지 않는 해시 알고리즘입니다.", ex);
        }
    }

    private void validateKakaoAuthConfig() {
        if (!StringUtils.hasText(kakaoAuthProperties.getClientId())
            || !StringUtils.hasText(kakaoAuthProperties.getRedirectUri())) {
            throw new ApiException(ErrorCode.AUTH_CONFIG_MISSING);
        }
    }
}
