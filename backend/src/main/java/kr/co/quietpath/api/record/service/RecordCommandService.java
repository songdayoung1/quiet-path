package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordImageAction;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.api.record.dto.response.RecordCreateResponse;
import kr.co.quietpath.api.record.dto.response.RecordUpdateResponse;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecordCommandService {

    private final RecordService recordService;
    private final RecordImageService recordImageService;

    /** 파일 처리를 먼저 끝낸 뒤 짧은 DB 저장 서비스로 기록 생성을 위임한다. */
    public RecordCreateResponse createRecord(Long userId, RecordCreateRequest request, MultipartFile imageFile) {
        StoredRecordImage storedImage = storeOptionalImage(imageFile);
        try {
            return recordService.createRecord(userId, request, storedImage);
        } catch (RuntimeException ex) {
            cleanupNewImage(storedImage);
            throw ex;
        }
    }

    /** 이미지 유지·교체·제거 상태를 검증하고 기록 수정과 파일 정리를 조율한다. */
    public RecordUpdateResponse updateRecord(
        Long userId,
        Long recordId,
        RecordUpdateRequest request,
        MultipartFile imageFile
    ) {
        RecordImageAction action = request.getImageAction() != null
            ? request.getImageAction()
            : RecordImageAction.KEEP;
        validateUpdateFile(action, imageFile);

        StoredRecordImage storedImage = action == RecordImageAction.REPLACE
            ? recordImageService.store(imageFile)
            : null;
        try {
            RecordUpdateExecution execution = recordService.updateRecord(
                userId,
                recordId,
                request,
                action,
                storedImage
            );
            cleanupPreviousImage(execution.previousStorageKey());
            return execution.response();
        } catch (RuntimeException ex) {
            cleanupNewImage(storedImage);
            throw ex;
        }
    }

    private StoredRecordImage storeOptionalImage(MultipartFile imageFile) {
        if (imageFile == null || imageFile.isEmpty()) {
            return null;
        }
        return recordImageService.store(imageFile);
    }

    private void validateUpdateFile(RecordImageAction action, MultipartFile imageFile) {
        boolean hasFile = imageFile != null && !imageFile.isEmpty();
        if (action == RecordImageAction.REPLACE && !hasFile) {
            throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
        }
        if (action != RecordImageAction.REPLACE && hasFile) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
    }

    private void cleanupNewImage(StoredRecordImage storedImage) {
        if (storedImage == null) {
            return;
        }
        try {
            recordImageService.delete(storedImage.storageKey());
        } catch (RuntimeException cleanupException) {
            log.warn(
                "Failed to clean up newly stored record image. storageKey={}",
                storedImage.storageKey(),
                cleanupException
            );
        }
    }

    private void cleanupPreviousImage(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            recordImageService.delete(storageKey);
        } catch (RuntimeException cleanupException) {
            log.warn("Failed to clean up previous record image. storageKey={}", storageKey, cleanupException);
        }
    }
}
