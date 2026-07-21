package kr.co.quietpath.api.record.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RecordImageProperties.class)
public class RecordImageConfig {
}
