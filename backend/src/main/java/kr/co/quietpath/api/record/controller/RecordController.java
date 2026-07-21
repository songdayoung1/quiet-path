package kr.co.quietpath.api.record.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordPinRequest;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.api.record.dto.request.RecordVisibilityRequest;
import kr.co.quietpath.api.record.dto.response.RecordCreateResponse;
import kr.co.quietpath.api.record.dto.response.RecordDetailResponse;
import kr.co.quietpath.api.record.dto.response.RecordListResponse;
import kr.co.quietpath.api.record.dto.response.RecordMonthlyResponse;
import kr.co.quietpath.api.record.dto.response.RecordPinResponse;
import kr.co.quietpath.api.record.dto.response.RecordShareResponse;
import kr.co.quietpath.api.record.dto.response.RecordTodayResponse;
import kr.co.quietpath.api.record.dto.response.RecordUpdateResponse;
import kr.co.quietpath.api.record.dto.response.RecordVisibilityResponse;
import kr.co.quietpath.api.record.service.RecordService;
import kr.co.quietpath.api.record.service.RecordCommandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/records")
@Validated
public class RecordController {

    private final RecordService recordService;
    private final RecordCommandService recordCommandService;

    @GetMapping
    public RecordListResponse getRecords(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = extractUserId(principal);
        return recordService.getRecords(userId);
    }

    @GetMapping("/monthly")
    public RecordMonthlyResponse getMonthlyRecords(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam @Positive Integer year,
        @RequestParam @Positive Integer month
    ) {
        Long userId = extractUserId(principal);
        return recordService.getMonthlyRecords(userId, year, month);
    }

    @GetMapping("/today")
    public ResponseEntity<RecordTodayResponse> getTodayRecord(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = extractUserId(principal);
        RecordTodayResponse response = recordService.getTodayRecord(userId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{recordId}")
    public RecordDetailResponse getRecordDetail(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable @Positive Long recordId
    ) {
        Long userId = extractUserId(principal);
        return recordService.getRecordDetail(userId, recordId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RecordCreateResponse> createRecord(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestPart("record") RecordCreateRequest request,
        @RequestPart(value = "image", required = false) org.springframework.web.multipart.MultipartFile image
    ) {
        Long userId = extractUserId(principal);
        RecordCreateResponse response = recordCommandService.createRecord(userId, request, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @RequestMapping(
        path = "/{recordId}",
        method = {RequestMethod.PUT, RequestMethod.PATCH},
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public RecordUpdateResponse updateRecord(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long recordId,
        @Valid @RequestPart("record") RecordUpdateRequest request,
        @RequestPart(value = "image", required = false) org.springframework.web.multipart.MultipartFile image
    ) {
        Long userId = extractUserId(principal);
        return recordCommandService.updateRecord(userId, recordId, request, image);
    }

    @DeleteMapping("/{recordId}")
    public ResponseEntity<Void> deleteRecord(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable @Positive Long recordId
    ) {
        Long userId = extractUserId(principal);
        recordService.deleteRecord(userId, recordId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{recordId}/share")
    public RecordShareResponse shareRecord(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long recordId
    ) {
        Long userId = extractUserId(principal);
        return recordService.shareRecord(userId, recordId);
    }

    @PatchMapping("/{recordId}/visibility")
    public RecordVisibilityResponse updateVisibility(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long recordId,
        @Valid @RequestBody RecordVisibilityRequest request
    ) {
        Long userId = extractUserId(principal);
        return recordService.updateVisibility(userId, recordId, request);
    }

    @PatchMapping("/{recordId}/pin")
    public RecordPinResponse updatePin(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable @Positive Long recordId,
        @Valid @RequestBody RecordPinRequest request
    ) {
        Long userId = extractUserId(principal);
        return recordService.updatePin(userId, recordId, request.getPinned());
    }

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return principal.getUserId();
    }
}
