package kr.co.quietpath.api.record.controller;

import jakarta.validation.Valid;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.api.record.dto.request.RecordVisibilityRequest;
import kr.co.quietpath.api.record.dto.response.RecordCreateResponse;
import kr.co.quietpath.api.record.dto.response.RecordDetailResponse;
import kr.co.quietpath.api.record.dto.response.RecordShareResponse;
import kr.co.quietpath.api.record.dto.response.RecordTodayResponse;
import kr.co.quietpath.api.record.dto.response.RecordUpdateResponse;
import kr.co.quietpath.api.record.dto.response.RecordVisibilityResponse;
import kr.co.quietpath.api.record.service.RecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.constraints.Positive;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/records")
@Validated
public class RecordController {

    private final RecordService recordService;

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

    @PostMapping
    public ResponseEntity<RecordCreateResponse> createRecord(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody RecordCreateRequest request
    ) {
        Long userId = extractUserId(principal);
        RecordCreateResponse response = recordService.createRecord(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{recordId}")
    @PatchMapping("/{recordId}")
    public RecordUpdateResponse updateRecord(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long recordId,
        @Valid @RequestBody RecordUpdateRequest request
    ) {
        Long userId = extractUserId(principal);
        return recordService.updateRecord(userId, recordId, request);
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

    private Long extractUserId(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return principal.getUserId();
    }
}
