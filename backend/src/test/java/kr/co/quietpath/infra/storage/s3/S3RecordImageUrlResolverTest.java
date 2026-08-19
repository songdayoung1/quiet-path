package kr.co.quietpath.infra.storage.s3;

import kr.co.quietpath.api.record.config.RecordImageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URI;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3RecordImageUrlResolverTest {

    @Mock
    private S3Presigner s3Presigner;

    @Mock
    private PresignedGetObjectRequest presignedGetObjectRequest;

    private S3RecordImageUrlResolver resolver;

    @BeforeEach
    void setUp() {
        RecordImageProperties properties = new RecordImageProperties();
        properties.getS3().setBucket("quiet-path-test");
        properties.getS3().setPresignedUrlTtlSeconds(600);
        resolver = new S3RecordImageUrlResolver(s3Presigner, properties);
    }

    @Test
    void resolve_presignsStorageKeyForTenMinutes() throws Exception {
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class)))
            .thenReturn(presignedGetObjectRequest);
        when(presignedGetObjectRequest.url())
            .thenReturn(URI.create("https://quiet-path-test.s3.amazonaws.com/records/image.webp?signature=test").toURL());

        String resolved = resolver.resolve(
            "records/2026/08/19/image.webp",
            "https://quiet-path-test.s3.amazonaws.com/records/2026/08/19/image.webp"
        );

        ArgumentCaptor<GetObjectPresignRequest> requestCaptor = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(s3Presigner).presignGetObject(requestCaptor.capture());
        GetObjectPresignRequest request = requestCaptor.getValue();
        assertEquals(Duration.ofMinutes(10), request.signatureDuration());
        assertEquals("quiet-path-test", request.getObjectRequest().bucket());
        assertEquals("records/2026/08/19/image.webp", request.getObjectRequest().key());
        assertEquals(
            "https://quiet-path-test.s3.amazonaws.com/records/image.webp?signature=test",
            resolved
        );
    }

    @Test
    void resolve_withoutStorageKey_returnsStoredUrlForLegacyData() {
        String resolved = resolver.resolve(null, "https://legacy.example.com/image.webp");

        assertEquals("https://legacy.example.com/image.webp", resolved);
    }
}
