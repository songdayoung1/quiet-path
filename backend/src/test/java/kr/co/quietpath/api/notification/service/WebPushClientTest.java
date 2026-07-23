package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.junit.jupiter.api.Test;

import java.security.Security;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WebPushClientTest {

    @Test
    void send_registersBouncyCastleBeforeParsingSubscriptionKey() {
        Security.removeProvider(BouncyCastleProvider.PROVIDER_NAME);
        WebPushClient client = new WebPushClient(configuredProperties());
        WebPushSubscription subscription = WebPushSubscription.create(
            1L,
            "https://push.example.com/subscription",
            "invalid-p256dh-key",
            "invalid-auth-key",
            "test-agent"
        );

        assertThrows(
            IllegalArgumentException.class,
            () -> client.send(subscription, "{}")
        );
        assertNotNull(Security.getProvider(BouncyCastleProvider.PROVIDER_NAME));
    }

    private WebPushProperties configuredProperties() {
        WebPushProperties properties = new WebPushProperties();
        properties.setPublicKey("public-key");
        properties.setPrivateKey("private-key");
        properties.setSubject("mailto:test@quietpath.app");
        return properties;
    }
}
