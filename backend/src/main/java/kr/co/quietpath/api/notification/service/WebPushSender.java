package kr.co.quietpath.api.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.apache.http.util.EntityUtils;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jose4j.lang.JoseException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.concurrent.ExecutionException;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebPushSender {

    private final WebPushProperties properties;
    private final ObjectMapper objectMapper;

    private volatile PushService pushService;

    public WebPushSendResult send(WebPushSubscription subscription, WebPushPayload payload) {
        if (!properties.isConfigured()) {
            log.debug("Skip web push because VAPID is not configured");
            return WebPushSendResult.FAILED;
        }

        HttpResponse response = null;
        try {
            Notification notification = new Notification(
                subscription.getEndpoint(),
                subscription.getP256dhKey(),
                subscription.getAuthKey(),
                serialize(payload)
            );
            response = getPushService().send(notification);
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode >= 200 && statusCode < 300) {
                return WebPushSendResult.DELIVERED;
            }
            if (statusCode == 404 || statusCode == 410) {
                return WebPushSendResult.EXPIRED;
            }
            log.warn("Web push failed: subscriptionId={}, status={}", subscription.getId(), statusCode);
            return WebPushSendResult.FAILED;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn("Web push interrupted: subscriptionId={}", subscription.getId());
            return WebPushSendResult.FAILED;
        } catch (GeneralSecurityException | IOException | ExecutionException | JoseException exception) {
            log.warn("Web push failed: subscriptionId={}", subscription.getId(), exception);
            return WebPushSendResult.FAILED;
        } finally {
            if (response != null) {
                EntityUtils.consumeQuietly(response.getEntity());
            }
        }
    }

    private String serialize(WebPushPayload payload) throws JsonProcessingException {
        return objectMapper.writeValueAsString(payload);
    }

    private PushService getPushService() throws GeneralSecurityException {
        PushService current = pushService;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (pushService == null) {
                if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                    Security.addProvider(new BouncyCastleProvider());
                }
                pushService = new PushService(
                    properties.getPublicKey(),
                    properties.getPrivateKey(),
                    properties.getSubject()
                );
            }
            return pushService;
        }
    }
}
