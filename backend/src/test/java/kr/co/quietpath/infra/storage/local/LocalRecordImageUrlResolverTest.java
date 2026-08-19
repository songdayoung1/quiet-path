package kr.co.quietpath.infra.storage.local;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LocalRecordImageUrlResolverTest {

    private final LocalRecordImageUrlResolver resolver = new LocalRecordImageUrlResolver();

    @Test
    void resolve_returnsStoredLocalUrl() {
        String resolved = resolver.resolve(
            "records/2026/08/19/image.webp",
            "/uploads/records/2026/08/19/image.webp"
        );

        assertEquals("/uploads/records/2026/08/19/image.webp", resolved);
    }
}
