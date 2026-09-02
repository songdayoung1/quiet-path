package kr.co.quietpath.infra.storage.local;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.config.RecordImageProperties;
import kr.co.quietpath.domain.record.image.ProcessedRecordImage;
import kr.co.quietpath.domain.record.image.RecordImageStorage;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.record-image.storage", havingValue = "local", matchIfMissing = true)
public class LocalRecordImageStorage implements RecordImageStorage {

    private static final DateTimeFormatter DIRECTORY_FORMAT = DateTimeFormatter.ofPattern("yyyy/MM/dd");

    private final Path rootDirectory;
    private final String publicPath;

    public LocalRecordImageStorage(RecordImageProperties properties) {
        this.rootDirectory = Path.of(properties.getLocal().getRootDirectory()).toAbsolutePath().normalize();
        this.publicPath = normalizePublicPath(properties.getLocal().getPublicPath());
    }

    /** 날짜별 경로와 UUID 파일명을 사용해 로컬 파일시스템에 이미지를 저장한다. */
    @Override
    public StoredRecordImage store(ProcessedRecordImage image, String keyPrefix) {
        String datePath = LocalDate.now().format(DIRECTORY_FORMAT);
        String storageKey = normalizeKeyPrefix(keyPrefix) + "/" + datePath + "/" + UUID.randomUUID() + "." + image.extension();
        Path target = resolveStoragePath(storageKey);

        try {
            Files.createDirectories(target.getParent());
            Files.write(target, image.bytes(), StandardOpenOption.CREATE_NEW);
            return new StoredRecordImage(storageKey, publicPath + "/" + storageKey);
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.IMAGE_UPLOAD_FAILED);
        }
    }

    /** 전달된 저장소 키가 로컬 루트 안에 있을 때만 파일을 삭제한다. */
    @Override
    public void delete(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(resolveStoragePath(storageKey));
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.IMAGE_UPLOAD_FAILED);
        }
    }

    private Path resolveStoragePath(String storageKey) {
        Path resolved = rootDirectory.resolve(storageKey).normalize();
        if (!resolved.startsWith(rootDirectory)) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
        }
        return resolved;
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

    private String normalizePublicPath(String path) {
        String normalized = path.startsWith("/") ? path : "/" + path;
        return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
    }
}
