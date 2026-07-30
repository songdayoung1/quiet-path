package kr.co.quietpath.api.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import org.apache.http.HttpResponse;
import org.apache.http.StatusLine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebPushSenderTest {

    @Mock
    private WebPushClient webPushClient;

    @Mock
    private HttpResponse response;

    @Mock
    private StatusLine statusLine;

    private WebPushProperties properties;
    private WebPushSender sender;
    private WebPushSubscription subscription;
    private WebPushPayload payload;

    @BeforeEach
    void setUp() {
        properties = configuredProperties();
        sender = new WebPushSender(properties, new ObjectMapper(), webPushClient);
        subscription = WebPushSubscription.create(
            1L,
            "https://push.example.com/subscription",
            "p256dh",
            "auth",
            "test-agent"
        );
        payload = new WebPushPayload("title", "body", "/", "tag");
    }

    @Test
    void send_returnsDeliveredForSuccessfulHttpStatus() throws Exception {
        givenResponseStatus(201);

        WebPushSendResult result = sender.send(subscription, payload);

        assertEquals(WebPushSendResult.DELIVERED, result);
        verify(webPushClient).send(eq(subscription), anyString());
    }

    @Test
    void send_returnsExpiredWhenPushServerNoLongerKnowsSubscription() throws Exception {
        givenResponseStatus(410);

        WebPushSendResult result = sender.send(subscription, payload);

        assertEquals(WebPushSendResult.EXPIRED, result);
    }

    @Test
    void send_returnsExpiredWhenSubscriptionEndpointIsMissing() throws Exception {
        givenResponseStatus(404);

        WebPushSendResult result = sender.send(subscription, payload);

        assertEquals(WebPushSendResult.EXPIRED, result);
    }

    @Test
    void send_keepsSubscriptionForTemporaryServerFailure() throws Exception {
        givenResponseStatus(503);

        WebPushSendResult result = sender.send(subscription, payload);

        assertEquals(WebPushSendResult.FAILED, result);
    }

    @Test
    void send_returnsFailedWhenClientThrowsIoException() throws Exception {
        when(webPushClient.send(any(), anyString())).thenThrow(new IOException("network failure"));

        WebPushSendResult result = sender.send(subscription, payload);

        assertEquals(WebPushSendResult.FAILED, result);
    }

    @Test
    void send_restoresInterruptedFlagWhenDeliveryIsInterrupted() throws Exception {
        when(webPushClient.send(any(), anyString())).thenThrow(new InterruptedException("interrupted"));

        WebPushSendResult result = sender.send(subscription, payload);

        assertEquals(WebPushSendResult.FAILED, result);
        assertTrue(Thread.currentThread().isInterrupted());
        assertTrue(Thread.interrupted());
        assertFalse(Thread.currentThread().isInterrupted());
    }

    @Test
    void send_stopsBeforeSerializationWhenVapidIsNotConfigured() {
        properties.setPrivateKey("");

        WebPushSendResult result = sender.send(subscription, payload);

        assertEquals(WebPushSendResult.FAILED, result);
        verifyNoInteractions(webPushClient);
    }

    private void givenResponseStatus(int statusCode) throws Exception {
        when(webPushClient.send(any(), anyString())).thenReturn(response);
        when(response.getStatusLine()).thenReturn(statusLine);
        when(statusLine.getStatusCode()).thenReturn(statusCode);
    }

    private WebPushProperties configuredProperties() {
        WebPushProperties configured = new WebPushProperties();
        configured.setPublicKey("public-key");
        configured.setPrivateKey("private-key");
        configured.setSubject("mailto:test@quietpath.app");
        return configured;
    }
}
