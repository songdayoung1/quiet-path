package kr.co.quietpath.infra.storage.local;

import kr.co.quietpath.api.record.config.RecordImageProperties;
import kr.co.quietpath.domain.record.image.ProcessedRecordImage;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalRecordImageStorageTest {

    @TempDir
    Path tempDirectory;

    @Test
    void storeAndDelete_usesConfiguredRootDirectory() {
        RecordImageProperties properties = new RecordImageProperties();
        properties.getLocal().setRootDirectory(tempDirectory.toString());
        properties.getLocal().setPublicPath("/uploads");
        LocalRecordImageStorage storage = new LocalRecordImageStorage(properties);
        ProcessedRecordImage image = new ProcessedRecordImage(
            new byte[]{1, 2, 3},
            "image/webp",
            "webp"
        );

        StoredRecordImage stored = storage.store(image);
        Path storedPath = tempDirectory.resolve(stored.storageKey());

        assertTrue(stored.storageKey().startsWith("records/"));
        assertTrue(stored.imageUrl().startsWith("/uploads/records/"));
        assertTrue(Files.exists(storedPath));

        storage.delete(stored.storageKey());

        assertFalse(Files.exists(storedPath));
    }

    @Test
    void storeWithPrefix_separatesPathCoverDirectory() {
        RecordImageProperties properties = new RecordImageProperties();
        properties.getLocal().setRootDirectory(tempDirectory.toString());
        properties.getLocal().setPublicPath("/uploads");
        LocalRecordImageStorage storage = new LocalRecordImageStorage(properties);
        ProcessedRecordImage image = new ProcessedRecordImage(
            new byte[]{1, 2, 3},
            "image/webp",
            "webp"
        );

        StoredRecordImage stored = storage.store(image, "path-covers/17");

        assertTrue(stored.storageKey().startsWith("path-covers/17/"));
        assertTrue(stored.imageUrl().startsWith("/uploads/path-covers/17/"));
        assertTrue(Files.exists(tempDirectory.resolve(stored.storageKey())));
    }
}
