package kr.co.quietpath.api.record.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RecordImageProperties.class)
public class RecordImageConfig {

    /** 실행 환경의 기본 자격 증명 체인을 사용하는 S3 클라이언트를 생성한다. */
    @Bean
    @ConditionalOnProperty(name = "app.record-image.storage", havingValue = "s3")
    public S3Client recordImageS3Client(RecordImageProperties properties) {
        String region = requireS3Property(properties.getS3().getRegion(), "region");
        return S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build();
    }

    private String requireS3Property(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("app.record-image.s3." + name + " must not be blank");
        }
        return value;
    }
}
