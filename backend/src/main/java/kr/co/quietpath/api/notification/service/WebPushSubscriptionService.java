package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.api.notification.dto.request.WebPushSubscriptionDeleteRequest;
import kr.co.quietpath.api.notification.dto.request.WebPushSubscriptionRegisterRequest;
import kr.co.quietpath.api.notification.dto.response.WebPushConfigResponse;
import kr.co.quietpath.api.notification.dto.response.WebPushSubscriptionResponse;
import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import kr.co.quietpath.domain.notification.repository.WebPushSubscriptionRepository;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WebPushSubscriptionService {

    private final WebPushProperties properties;
    private final WebPushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    public WebPushConfigResponse getConfig() {
        boolean enabled = properties.isConfigured();
        return WebPushConfigResponse.builder()
            .enabled(enabled)
            .publicKey(enabled ? properties.getPublicKey() : null)
            .build();
    }

    @Transactional
    public WebPushSubscriptionResponse register(
        Long userId,
        WebPushSubscriptionRegisterRequest request,
        String userAgent
    ) {
        if (!properties.isConfigured()) {
            throw new ApiException(ErrorCode.WEB_PUSH_NOT_CONFIGURED);
        }
        if (!userRepository.existsById(userId)) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND);
        }

        String endpointHash = WebPushSubscription.hashEndpoint(request.getEndpoint());
        WebPushSubscription subscription = subscriptionRepository.findByEndpointHash(endpointHash)
            .orElseGet(() -> WebPushSubscription.create(
                userId,
                request.getEndpoint(),
                request.getKeys().getP256dh(),
                request.getKeys().getAuth(),
                normalizeUserAgent(userAgent)
            ));

        subscription.replaceOwnerAndKeys(
            userId,
            request.getKeys().getP256dh(),
            request.getKeys().getAuth(),
            normalizeUserAgent(userAgent)
        );
        subscriptionRepository.save(subscription);
        return WebPushSubscriptionResponse.builder().subscribed(true).build();
    }

    @Transactional
    public WebPushSubscriptionResponse unsubscribe(
        Long userId,
        WebPushSubscriptionDeleteRequest request
    ) {
        String endpointHash = WebPushSubscription.hashEndpoint(request.getEndpoint());
        subscriptionRepository.findByEndpointHash(endpointHash)
            .filter(subscription -> subscription.getUserId().equals(userId))
            .ifPresent(subscriptionRepository::delete);
        return WebPushSubscriptionResponse.builder().subscribed(false).build();
    }

    private String normalizeUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        return userAgent.length() <= 500 ? userAgent : userAgent.substring(0, 500);
    }
}
