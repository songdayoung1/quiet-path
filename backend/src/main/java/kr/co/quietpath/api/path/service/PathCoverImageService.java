package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.request.PathCoverImageUpdateRequest;
import kr.co.quietpath.api.path.dto.response.PathCoverImageResponse;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.entity.PathCoverImage;
import kr.co.quietpath.domain.path.repository.PathCoverImageRepository;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.image.RecordImageUrlResolver;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class PathCoverImageService {

    private static final String STATUS_ACTIVE = "ACTIVE";

    private final PathRepository pathRepository;
    private final PathCoverImageRepository pathCoverImageRepository;
    private final RecordImageUrlResolver imageUrlResolver;

    public PathCoverImageUpdateExecution update(
        Long userId,
        Long pathId,
        PathCoverImageUpdateRequest request,
        StoredRecordImage storedImage
    ) {
        Path path = getOwnedActivePath(userId, pathId);
        PathCoverImage coverImage = pathCoverImageRepository.findByPath_Id(pathId).orElse(null);

        if (coverImage == null && storedImage == null) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
        }

        String previousStorageKey = null;
        if (storedImage != null) {
            if (coverImage == null) {
                coverImage = PathCoverImage.builder()
                    .path(path)
                    .storageKey(storedImage.storageKey())
                    .imageUrl(storedImage.imageUrl())
                    .positionX(request.getPositionX())
                    .positionY(request.getPositionY())
                    .scale(request.getScale())
                    .build();
            } else {
                previousStorageKey = coverImage.getStorageKey();
                coverImage.replace(
                    storedImage.storageKey(),
                    storedImage.imageUrl(),
                    request.getPositionX(),
                    request.getPositionY(),
                    request.getScale()
                );
            }
        } else {
            coverImage.updateDisplayPosition(
                request.getPositionX(),
                request.getPositionY(),
                request.getScale()
            );
        }

        PathCoverImage saved = pathCoverImageRepository.save(coverImage);
        return new PathCoverImageUpdateExecution(toResponse(saved), previousStorageKey);
    }

    public String delete(Long userId, Long pathId) {
        getOwnedActivePath(userId, pathId);
        PathCoverImage coverImage = pathCoverImageRepository.findByPath_Id(pathId).orElse(null);
        if (coverImage == null) {
            return null;
        }
        String storageKey = coverImage.getStorageKey();
        pathCoverImageRepository.delete(coverImage);
        return storageKey;
    }

    @Transactional(readOnly = true)
    public PathCoverImageResponse getByPathId(Long pathId) {
        return pathCoverImageRepository.findByPath_Id(pathId)
            .map(this::toResponse)
            .orElse(null);
    }

    private Path getOwnedActivePath(Long userId, Long pathId) {
        Path path = pathRepository.findById(pathId)
            .orElseThrow(() -> new ApiException(ErrorCode.PATH_NOT_FOUND));
        if (!path.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
        if (!STATUS_ACTIVE.equals(path.getStatus())) {
            throw new ApiException(ErrorCode.PATH_NOT_ACTIVE);
        }
        return path;
    }

    private PathCoverImageResponse toResponse(PathCoverImage image) {
        return PathCoverImageResponse.builder()
            .imageUrl(imageUrlResolver.resolve(image.getStorageKey(), image.getImageUrl()))
            .positionX(image.getPositionX())
            .positionY(image.getPositionY())
            .scale(image.getScale())
            .build();
    }
}
