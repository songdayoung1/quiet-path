package kr.co.quietpath.api.notification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
public class NotificationSchedulingConfig {

    @Bean
    public Clock notificationClock() {
        return Clock.systemUTC();
    }
}
