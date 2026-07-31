package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Utils;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.KeyPairGenerator;
import java.security.Security;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

    @Test
    void send_usesAes128GcmEncoding() throws Exception {
        Security.addProvider(new BouncyCastleProvider());
        PushService pushService = mock(PushService.class);
        HttpResponse response = mock(HttpResponse.class);
        WebPushClient client = new WebPushClient(configuredProperties());
        ReflectionTestUtils.setField(client, "pushService", pushService);
        WebPushSubscription subscription = WebPushSubscription.create(
            1L,
            "https://fcm.googleapis.com/fcm/send/test-subscription",
            generateBrowserPublicKey(),
            "AAECAwQFBgcICQoLDA0ODw",
            "test-agent"
        );
        when(pushService.send(any(Notification.class), eq(Encoding.AES128GCM))).thenReturn(response);

        HttpResponse result = client.send(subscription, "{}");

        assertSame(response, result);
        verify(pushService).send(any(Notification.class), eq(Encoding.AES128GCM));
    }

    private String generateBrowserPublicKey() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME);
        generator.initialize(ECNamedCurveTable.getParameterSpec("prime256v1"));
        ECPublicKey publicKey = (ECPublicKey) generator.generateKeyPair().getPublic();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(Utils.encode(publicKey));
    }

    private WebPushProperties configuredProperties() {
        WebPushProperties properties = new WebPushProperties();
        properties.setPublicKey("public-key");
        properties.setPrivateKey("private-key");
        properties.setSubject("mailto:test@quietpath.app");
        return properties;
    }
}
