package kr.co.quietpath.infra.storage.s3;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.config.RecordImageProperties;
import kr.co.quietpath.domain.record.image.ProcessedRecordImage;
import kr.co.quietpath.domain.record.image.RecordImageStorage;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.record-image.storage", havingValue = "s3")
public class S3RecordImageStorage implements RecordImageStorage {

    private static final DateTimeFormatter DIRECTORY_FORMAT = DateTimeFormatter.ofPattern("yyyy/MM/dd");

    private final S3Client s3Client;
    private final String bucket;
    private final String baseUrl;

    public S3RecordImageStorage(S3Client s3Client, RecordImageProperties properties) {
        this.s3Client = s3Client;
        this.bucket = requireProperty(properties.getS3().getBucket(), "bucket");
        this.baseUrl = normalizeBaseUrl(requireProperty(properties.getS3().getBaseUrl(), "base-url"));
    }

    /** 날짜별 객체 키에 이미지를 업로드하고 클라이언트가 사용할 URL을 반환한다. */
    @Override
    public StoredRecordImage store(ProcessedRecordImage image, String keyPrefix) {
        String storageKey = createStorageKey(keyPrefix, image.extension());
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(storageKey)
            .contentType(image.contentType())
            .contentLength((long) image.bytes().length)
            .build();

        try {
            s3Client.putObject(request, RequestBody.fromBytes(image.bytes()));
            return new StoredRecordImage(storageKey, baseUrl + "/" + storageKey);
        } catch (SdkException ex) {
            throw new ApiException(ErrorCode.IMAGE_UPLOAD_FAILED);
        }
    }

    /** DB에 저장된 객체 키를 사용해 S3 이미지를 삭제한다. */
    @Override
    public void delete(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        DeleteObjectRequest request = DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(storageKey)
            .build();
        try {
            s3Client.deleteObject(request);
        } catch (SdkException ex) {
            throw new ApiException(ErrorCode.IMAGE_UPLOAD_FAILED);
        }
    }

    private String createStorageKey(String keyPrefix, String extension) {
        String datePath = LocalDate.now().format(DIRECTORY_FORMAT);
        return normalizeKeyPrefix(keyPrefix) + "/" + datePath + "/" + UUID.randomUUID() + "." + extension;
    }

    private String normalizeKeyPrefix(String keyPrefix) {
        if (keyPrefix == null || keyPrefix.isBlank() || keyPrefix.startsWith("/") || keyPrefix.contains("..")) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
        }
        String normalized = keyPrefix.endsWith("/")
            ? keyPrefix.substring(0, keyPrefix.length() - 1)
            : keyPrefix;
        if (!normalized.matches("[a-zA-Z0-9/_-]+")) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
        }
        return normalized;
    }

    private String requireProperty(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("app.record-image.s3." + name + " must not be blank");
        }
        return value;
    }

    private String normalizeBaseUrl(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
