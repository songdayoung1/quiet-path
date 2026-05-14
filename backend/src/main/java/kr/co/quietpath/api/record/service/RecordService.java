package kr.co.quietpath.api.record.service;

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
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class RecordService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final String VISIBILITY_PRIVATE = "PRIVATE";
    private static final Set<String> ALLOWED_MOOD_CODES = Set.of("포근", "멍함", "반짝", "잔잔", "버팀", "두근");

    private final RecordRepository recordRepository;
    private final UserRepository userRepository;
    private final PathRepository pathRepository;
    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;

    public RecordCreateResponse createRecord(Long userId, RecordCreateRequest request) {
        User user = getUser(userId);
        Path activePath = pathRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE)
            .orElseThrow(() -> new ApiException(ErrorCode.ACTIVE_PATH_REQUIRED));

        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        if (recordRepository.existsByUser_IdAndRecordDate(userId, today)) {
            throw new ApiException(ErrorCode.RECORD_ALREADY_EXISTS);
        }

        String visibility = normalizeVisibility(request.getVisibility());
        String moodCode = normalizeMoodCode(request.getMoodCode());

        Record record = Record.builder()
            .user(user)
            .path(activePath)
            .categoryCode(activePath.getCategoryCode())
            .recordDate(today)
            .sceneText(request.getContent())
            .oneWordText(null)
            .tomorrowText(null)
            .moodCode(moodCode)
            .imageUrl(null)
            .build();

        try {
            recordRepository.save(record);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(ErrorCode.RECORD_ALREADY_EXISTS);
        }

        if (VISIBILITY_PUBLIC.equals(visibility)) {
            record.share();
        }

        return RecordCreateResponse.builder()
            .id(record.getId())
            .pathId(activePath.getId())
            .recordDate(formatDate(today))
            .content(resolveContent(record))
            .moodCode(record.getMoodCode())
            .visibility(record.getVisibility())
            .createdAt(formatDateTime(record.getCreatedAt()))
            .build();
    }

    @Transactional(readOnly = true)
    public RecordTodayResponse getTodayRecord(Long userId) {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        return recordRepository.findByUser_IdAndRecordDate(userId, today)
            .map(record -> RecordTodayResponse.builder()
                .id(record.getId())
                .pathId(record.getPath().getId())
                .recordDate(formatDate(record.getRecordDate()))
                .content(resolveContent(record))
                .moodCode(record.getMoodCode())
                .visibility(record.getVisibility())
                .createdAt(formatDateTime(record.getCreatedAt()))
                .build())
            .orElse(null);
    }

    @Transactional(readOnly = true)
    public RecordDetailResponse getRecordDetail(Long userId, Long recordId) {
        Record record = recordRepository.findById(recordId)
            .orElseThrow(() -> new ApiException(ErrorCode.RECORD_NOT_FOUND));

        boolean isOwner = record.getUser() != null
            && record.getUser().getId() != null
            && record.getUser().getId().equals(userId);

        if (!VISIBILITY_PUBLIC.equals(record.getVisibility()) && !isOwner) {
            throw new ApiException(ErrorCode.RECORD_NOT_PUBLIC);
        }

        long reactionCount = reactionRepository.countByTargetTypeAndTargetId("RECORD", record.getId());
        boolean isReacted = reactionRepository.existsByUserIdAndTargetTypeAndTargetId(userId, "RECORD", record.getId());
        long commentCount = commentRepository.countByRecordId(record.getId());

        User owner = record.getUser();
        RecordDetailResponse.OwnerSummary ownerSummary = RecordDetailResponse.OwnerSummary.builder()
            .userId(owner != null ? owner.getId() : null)
            .nickname(owner != null ? owner.getNickname() : null)
            .profileImageUrl(null)
            .build();

        return RecordDetailResponse.builder()
            .id(record.getId())
            .pathId(record.getPath() != null ? record.getPath().getId() : null)
            .recordDate(formatDate(record.getRecordDate()))
            .content(resolveContent(record))
            .moodCode(record.getMoodCode())
            .visibility(record.getVisibility())
            .owner(ownerSummary)
            .reactionCount(reactionCount)
            .isReacted(isReacted)
            .commentCount(commentCount)
            .createdAt(formatDateTime(record.getCreatedAt()))
            .updatedAt(formatDateTime(record.getUpdatedAt()))
            .build();
    }

    public RecordUpdateResponse updateRecord(Long userId, Long recordId, RecordUpdateRequest request) {
        Record record = getRecord(recordId);
        validateOwner(userId, record);
        validateEditable(record);
        String moodCode = normalizeMoodCode(request.getMoodCode());

        record.updateContent(
            request.getContent(),
            record.getOneWordText(),
            record.getTomorrowText(),
            moodCode
        );

        String visibility = normalizeVisibility(request.getVisibility());
        applyVisibility(record, visibility);

        return RecordUpdateResponse.builder()
            .id(record.getId())
            .content(resolveContent(record))
            .moodCode(record.getMoodCode())
            .visibility(record.getVisibility())
            .updatedAt(formatDateTime(record.getUpdatedAt()))
            .build();
    }

    public RecordShareResponse shareRecord(Long userId, Long recordId) {
        Record record = getRecord(recordId);
        validateOwner(userId, record);
        if (VISIBILITY_PUBLIC.equals(record.getVisibility())) {
            throw new ApiException(ErrorCode.RECORD_ALREADY_SHARED);
        }
        record.share();
        return RecordShareResponse.builder()
            .id(record.getId())
            .visibility(record.getVisibility())
            .build();
    }

    public RecordVisibilityResponse updateVisibility(Long userId, Long recordId, RecordVisibilityRequest request) {
        Record record = getRecord(recordId);
        validateOwner(userId, record);

        String visibility = normalizeVisibility(request.getVisibility());
        applyVisibility(record, visibility);

        return RecordVisibilityResponse.builder()
            .id(record.getId())
            .visibility(record.getVisibility())
            .sharedAt(record.getSharedAt() != null ? formatDateTime(record.getSharedAt()) : null)
            .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private Record getRecord(Long recordId) {
        return recordRepository.findById(recordId)
            .orElseThrow(() -> new ApiException(ErrorCode.RECORD_NOT_FOUND));
    }

    private void validateOwner(Long userId, Record record) {
        if (record.getUser() == null || record.getUser().getId() == null) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
        if (!record.getUser().getId().equals(userId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
    }

    private void validateEditable(Record record) {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        if (!today.equals(record.getRecordDate())) {
            throw new ApiException(ErrorCode.RECORD_NOT_EDITABLE);
        }
    }

    private String normalizeVisibility(String visibility) {
        if (visibility == null || visibility.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        if (VISIBILITY_PUBLIC.equals(visibility)) {
            return VISIBILITY_PUBLIC;
        }
        if (VISIBILITY_PRIVATE.equals(visibility)) {
            return VISIBILITY_PRIVATE;
        }
        throw new ApiException(ErrorCode.INVALID_REQUEST);
    }

    private String normalizeMoodCode(String moodCode) {
        if (moodCode == null || moodCode.isBlank()) {
            return null;
        }
        if (!ALLOWED_MOOD_CODES.contains(moodCode)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return moodCode;
    }

    private void applyVisibility(Record record, String visibility) {
        if (VISIBILITY_PUBLIC.equals(visibility)) {
            if (!VISIBILITY_PUBLIC.equals(record.getVisibility())) {
                record.share();
            }
            return;
        }
        if (VISIBILITY_PRIVATE.equals(visibility)) {
            record.unshare();
        }
    }

    private String resolveContent(Record record) {
        if (record.getSceneText() != null && !record.getSceneText().isBlank()) {
            return record.getSceneText();
        }
        return record.getOneWordText();
    }

    private String formatDate(LocalDate date) {
        return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
