package kr.co.quietpath.infra.storage.s3;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.config.RecordImageProperties;
import kr.co.quietpath.domain.record.image.RecordImageUrlResolver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;

@Component
@ConditionalOnProperty(name = "app.record-image.storage", havingValue = "s3")
public class S3RecordImageUrlResolver implements RecordImageUrlResolver {

    private final S3Presigner s3Presigner;
    private final String bucket;
    private final Duration signatureDuration;

    public S3RecordImageUrlResolver(S3Presigner s3Presigner, RecordImageProperties properties) {
        this.s3Presigner = s3Presigner;
        this.bucket = requireProperty(properties.getS3().getBucket(), "bucket");
        this.signatureDuration = Duration.ofSeconds(properties.getS3().getPresignedUrlTtlSeconds());
    }

    /** 비공개 S3 객체를 제한된 시간 동안 조회할 수 있는 서명 URL로 변환한다. */
    @Override
    public String resolve(String storageKey, String storedImageUrl) {
        if (storageKey == null || storageKey.isBlank()) {
            return storedImageUrl;
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(bucket)
            .key(storageKey)
            .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(signatureDuration)
            .getObjectRequest(getObjectRequest)
            .build();

        try {
            return s3Presigner.presignGetObject(presignRequest).url().toExternalForm();
        } catch (SdkException ex) {
            throw new ApiException(ErrorCode.IMAGE_URL_GENERATION_FAILED);
        }
    }

    private String requireProperty(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("app.record-image.s3." + name + " must not be blank");
        }
        return value;
    }
}
