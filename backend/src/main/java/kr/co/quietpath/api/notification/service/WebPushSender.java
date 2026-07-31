package kr.co.quietpath.api.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpResponse;
import org.apache.http.util.EntityUtils;
import org.jose4j.lang.JoseException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.concurrent.ExecutionException;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebPushSender {

    private final WebPushProperties properties;
    private final ObjectMapper objectMapper;
    private final WebPushClient webPushClient;

    public WebPushSendResult send(WebPushSubscription subscription, WebPushPayload payload) {
        if (!properties.isConfigured()) {
            log.debug("Skip web push because VAPID is not configured");
            return WebPushSendResult.FAILED;
        }

        HttpResponse response = null;
        try {
            response = webPushClient.send(subscription, serialize(payload));
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode >= 200 && statusCode < 300) {
                return WebPushSendResult.DELIVERED;
            }
            if (statusCode == 404 || statusCode == 410) {
                return WebPushSendResult.EXPIRED;
            }
            String responseBody = response.getEntity() == null
                ? ""
                : EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            log.warn(
                "Web push failed: subscriptionId={}, status={}, response={}",
                subscription.getId(),
                statusCode,
                responseBody.length() > 500 ? responseBody.substring(0, 500) : responseBody
            );
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
}
