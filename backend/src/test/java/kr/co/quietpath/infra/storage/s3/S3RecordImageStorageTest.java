package kr.co.quietpath.infra.storage.s3;

import kr.co.quietpath.api.record.config.RecordImageProperties;
import kr.co.quietpath.domain.record.image.ProcessedRecordImage;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3RecordImageStorageTest {

    @Mock
    private S3Client s3Client;

    private S3RecordImageStorage storage;

    @BeforeEach
    void setUp() {
        RecordImageProperties properties = new RecordImageProperties();
        properties.getS3().setBucket("quiet-path-test");
        properties.getS3().setBaseUrl("https://cdn.example.com/");
        storage = new S3RecordImageStorage(s3Client, properties);
    }

    @Test
    void store_uploadsImageAndReturnsConfiguredUrl() {
        ProcessedRecordImage image = new ProcessedRecordImage(
            new byte[]{1, 2, 3},
            "image/webp",
            "webp"
        );
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .thenReturn(PutObjectResponse.builder().build());

        StoredRecordImage stored = storage.store(image);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));
        PutObjectRequest request = requestCaptor.getValue();
        assertEquals("quiet-path-test", request.bucket());
        assertEquals("image/webp", request.contentType());
        assertEquals(3L, request.contentLength());
        assertTrue(request.key().matches("records/\\d{4}/\\d{2}/\\d{2}/[0-9a-f-]+\\.webp"));
        assertEquals(request.key(), stored.storageKey());
        assertEquals("https://cdn.example.com/" + request.key(), stored.imageUrl());
    }

    @Test
    void delete_removesObjectByStorageKey() {
        when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
            .thenReturn(DeleteObjectResponse.builder().build());

        storage.delete("records/2026/07/21/image.webp");

        ArgumentCaptor<DeleteObjectRequest> requestCaptor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(requestCaptor.capture());
        assertEquals("quiet-path-test", requestCaptor.getValue().bucket());
        assertEquals("records/2026/07/21/image.webp", requestCaptor.getValue().key());
    }
}
