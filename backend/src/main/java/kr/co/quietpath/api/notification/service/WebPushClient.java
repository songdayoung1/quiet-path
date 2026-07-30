package kr.co.quietpath.api.notification.service;

import kr.co.quietpath.api.notification.config.WebPushProperties;
import kr.co.quietpath.domain.notification.entity.WebPushSubscription;
import lombok.RequiredArgsConstructor;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jose4j.lang.JoseException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.concurrent.ExecutionException;

@Component
@RequiredArgsConstructor
public class WebPushClient {

    private final WebPushProperties properties;

    private volatile PushService pushService;

    public HttpResponse send(WebPushSubscription subscription, String payload)
        throws GeneralSecurityException, IOException, ExecutionException, JoseException, InterruptedException {
        ensureBouncyCastleProvider();
        Notification notification = new Notification(
            subscription.getEndpoint(),
            subscription.getP256dhKey(),
            subscription.getAuthKey(),
            payload
        );
        return getPushService().send(notification, Encoding.AES128GCM);
    }

    private PushService getPushService() throws GeneralSecurityException {
        PushService current = pushService;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (pushService == null) {
                pushService = new PushService(
                    properties.getPublicKey(),
                    properties.getPrivateKey(),
                    properties.getSubject()
                );
            }
            return pushService;
        }
    }

    private void ensureBouncyCastleProvider() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) != null) {
            return;
        }
        synchronized (Security.class) {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
        }
    }
}
