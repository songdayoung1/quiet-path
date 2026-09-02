package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.path.dto.request.PathCoverImageUpdateRequest;
import kr.co.quietpath.api.path.dto.response.PathCoverImageResponse;
import kr.co.quietpath.api.record.service.RecordImageService;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class PathCoverImageCommandService {

    private final PathCoverImageService pathCoverImageService;
    private final RecordImageService recordImageService;

    public PathCoverImageResponse update(
        Long userId,
        Long pathId,
        PathCoverImageUpdateRequest request,
        MultipartFile imageFile
    ) {
        StoredRecordImage storedImage = storeOptionalImage(pathId, imageFile);
        try {
            PathCoverImageUpdateExecution execution = pathCoverImageService.update(
                userId,
                pathId,
                request,
                storedImage
            );
            cleanup(execution.previousStorageKey());
            return execution.response();
        } catch (RuntimeException ex) {
            if (storedImage != null) {
                cleanup(storedImage.storageKey());
            }
            throw ex;
        }
    }

    public void delete(Long userId, Long pathId) {
        cleanup(pathCoverImageService.delete(userId, pathId));
    }

    private StoredRecordImage storeOptionalImage(Long pathId, MultipartFile imageFile) {
        if (imageFile == null || imageFile.isEmpty()) {
            return null;
        }
        return recordImageService.store(imageFile, "path-covers/" + pathId);
    }

    private void cleanup(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            recordImageService.delete(storageKey);
        } catch (RuntimeException ex) {
            log.warn("Failed to clean up path cover image. storageKey={}", storageKey, ex);
        }
    }
}
