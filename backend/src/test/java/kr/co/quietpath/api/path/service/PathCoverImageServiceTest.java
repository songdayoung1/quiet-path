package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.request.PathCoverImageUpdateRequest;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.entity.PathCoverImage;
import kr.co.quietpath.domain.path.repository.PathCoverImageRepository;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.image.RecordImageUrlResolver;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PathCoverImageServiceTest {

    @Mock
    private PathRepository pathRepository;

    @Mock
    private PathCoverImageRepository pathCoverImageRepository;

    @Mock
    private RecordImageUrlResolver imageUrlResolver;

    @InjectMocks
    private PathCoverImageService pathCoverImageService;

    @Test
    void update_newImage_createsIndependentPathCover() {
        Path path = buildPath(10L, 1L);
        PathCoverImageUpdateRequest request = request("35.00", "65.00", "1.40");
        StoredRecordImage storedImage = new StoredRecordImage(
            "path-covers/10/2026/08/27/cover.webp",
            "/uploads/path-covers/10/cover.webp"
        );

        when(pathRepository.findById(10L)).thenReturn(Optional.of(path));
        when(pathCoverImageRepository.findByPath_Id(10L)).thenReturn(Optional.empty());
        when(pathCoverImageRepository.save(any(PathCoverImage.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(imageUrlResolver.resolve(storedImage.storageKey(), storedImage.imageUrl()))
            .thenReturn("https://signed.example/cover.webp");

        PathCoverImageUpdateExecution execution = pathCoverImageService.update(
            1L,
            10L,
            request,
            storedImage
        );

        ArgumentCaptor<PathCoverImage> captor = ArgumentCaptor.forClass(PathCoverImage.class);
        org.mockito.Mockito.verify(pathCoverImageRepository).save(captor.capture());
        assertEquals(10L, captor.getValue().getPath().getId());
        assertEquals(new BigDecimal("35.00"), captor.getValue().getPositionX());
        assertEquals("https://signed.example/cover.webp", execution.response().getImageUrl());
        assertNull(execution.previousStorageKey());
    }

    @Test
    void update_replacement_returnsPreviousStorageKey() {
        Path path = buildPath(10L, 1L);
        PathCoverImage current = PathCoverImage.builder()
            .path(path)
            .storageKey("path-covers/10/old.webp")
            .imageUrl("/uploads/old.webp")
            .build();
        StoredRecordImage replacement = new StoredRecordImage(
            "path-covers/10/new.webp",
            "/uploads/new.webp"
        );

        when(pathRepository.findById(10L)).thenReturn(Optional.of(path));
        when(pathCoverImageRepository.findByPath_Id(10L)).thenReturn(Optional.of(current));
        when(pathCoverImageRepository.save(current)).thenReturn(current);
        when(imageUrlResolver.resolve(replacement.storageKey(), replacement.imageUrl()))
            .thenReturn("https://signed.example/new.webp");

        PathCoverImageUpdateExecution execution = pathCoverImageService.update(
            1L,
            10L,
            request("50.00", "50.00", "1.00"),
            replacement
        );

        assertEquals("path-covers/10/old.webp", execution.previousStorageKey());
        assertEquals("path-covers/10/new.webp", current.getStorageKey());
    }

    @Test
    void update_withoutExistingImageOrFile_returnsInvalidImage() {
        Path path = buildPath(10L, 1L);
        when(pathRepository.findById(10L)).thenReturn(Optional.of(path));
        when(pathCoverImageRepository.findByPath_Id(10L)).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> pathCoverImageService.update(
            1L,
            10L,
            request("50.00", "50.00", "1.00"),
            null
        ));

        assertEquals(ErrorCode.INVALID_IMAGE_FILE, error.getErrorCode());
    }

    @Test
    void update_otherUsersPath_returnsNotOwner() {
        Path path = buildPath(10L, 2L);
        when(pathRepository.findById(10L)).thenReturn(Optional.of(path));

        ApiException error = assertThrows(ApiException.class, () -> pathCoverImageService.update(
            1L,
            10L,
            request("50.00", "50.00", "1.00"),
            new StoredRecordImage("path-covers/10/new.webp", "/uploads/new.webp")
        ));

        assertEquals(ErrorCode.NOT_OWNER, error.getErrorCode());
    }

    private PathCoverImageUpdateRequest request(String positionX, String positionY, String scale) {
        PathCoverImageUpdateRequest request = new PathCoverImageUpdateRequest();
        request.setPositionX(new BigDecimal(positionX));
        request.setPositionY(new BigDecimal(positionY));
        request.setScale(new BigDecimal(scale));
        return request;
    }

    private Path buildPath(Long id, Long userId) {
        Path path = Path.builder()
            .userId(userId)
            .categoryCode("study")
            .directionName("꾸준히 기록하기")
            .directionText("오늘도 기록했는가?")
            .reviewAt(LocalDateTime.now().plusDays(7))
            .build();
        setId(path, id);
        return path;
    }

    private void setId(Path path, Long id) {
        try {
            Field field = Path.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(path, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
