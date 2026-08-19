package kr.co.quietpath.api.record.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.comment.service.CommentPageCacheService;
import kr.co.quietpath.api.feed.service.WeeklyTop3CacheService;
import kr.co.quietpath.api.record.dto.request.RecordCreateRequest;
import kr.co.quietpath.api.record.dto.request.RecordUpdateRequest;
import kr.co.quietpath.api.record.dto.request.RecordImageAction;
import kr.co.quietpath.api.record.dto.request.RecordVisibilityRequest;
import kr.co.quietpath.api.record.dto.response.RecordCreateResponse;
import kr.co.quietpath.api.record.dto.response.RecordDetailResponse;
import kr.co.quietpath.api.record.dto.response.RecordListItem;
import kr.co.quietpath.api.record.dto.response.RecordListResponse;
import kr.co.quietpath.api.record.dto.response.RecordMonthlyResponse;
import kr.co.quietpath.api.record.dto.response.RecordPinResponse;
import kr.co.quietpath.api.record.dto.response.RecordShareResponse;
import kr.co.quietpath.api.record.dto.response.RecordTodayResponse;
import kr.co.quietpath.api.record.dto.response.RecordUpdateResponse;
import kr.co.quietpath.api.record.dto.response.RecordVisibilityResponse;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.entity.RecordImage;
import kr.co.quietpath.domain.record.image.RecordImageUrlResolver;
import kr.co.quietpath.domain.record.image.StoredRecordImage;
import kr.co.quietpath.domain.record.repository.RecordImageRepository;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RecordService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final String VISIBILITY_PRIVATE = "PRIVATE";
    private static final Set<String> ALLOWED_MOOD_CODES = Set.of("포근", "멍함", "반짝", "잔잔", "버팀", "두근");

    private final RecordRepository recordRepository;
    private final RecordImageRepository recordImageRepository;
    private final UserRepository userRepository;
    private final PathRepository pathRepository;
    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    private final WeeklyTop3CacheService weeklyTop3CacheService;
    private final CommentPageCacheService commentPageCacheService;
    private final RecordImageUrlResolver recordImageUrlResolver;

    @Transactional
    public RecordCreateResponse createRecord(Long userId, RecordCreateRequest request) {
        return createRecord(userId, request, null);
    }

    @Transactional
    public RecordCreateResponse createRecord(
        Long userId,
        RecordCreateRequest request,
        StoredRecordImage storedImage
    ) {
        User user = getUser(userId);
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        Path activePath = pathRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE)
            .orElseThrow(() -> new ApiException(ErrorCode.ACTIVE_PATH_REQUIRED));
        if (isExpired(activePath, today)) {
            throw new ApiException(ErrorCode.PATH_REVIEW_REQUIRED);
        }

        if (recordRepository.existsByPath_IdAndRecordDateAndIsHiddenFalse(activePath.getId(), today)) {
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
            .oneWordText(normalizeOptionalText(request.getOneWordText()))
            .tomorrowText(normalizeOptionalText(request.getTomorrowText()))
            .moodCode(moodCode)
            .build();

        if (storedImage != null) {
            RecordImage recordImage = createRecordImage(storedImage, request);
            recordImageRepository.save(recordImage);
            record.attachImage(recordImage);
        }

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
            .categoryCode(record.getCategoryCode())
            .recordDate(formatDate(today))
            .content(resolveContent(record))
            .oneWordText(record.getOneWordText())
            .tomorrowText(record.getTomorrowText())
            .moodCode(record.getMoodCode())
            .imageUrl(resolveImageUrl(record))
            .imagePositionX(resolvePositionX(record))
            .imagePositionY(resolvePositionY(record))
            .imageScale(resolveScale(record))
            .visibility(record.getVisibility())
            .sharedAt(record.getSharedAt() != null ? formatDateTime(record.getSharedAt()) : null)
            .createdAt(formatDateTime(record.getCreatedAt()))
            .build();
    }

    @Transactional(readOnly = true)
    public RecordListResponse getRecords(Long userId) {
        getUser(userId);
        List<RecordListItem> items = recordRepository.findByUser_IdAndIsHiddenFalseOrderByPinnedAtDescRecordDateDescIdDesc(userId)
            .stream()
            .map(this::toListItem)
            .toList();
        return RecordListResponse.builder()
            .items(items)
            .build();
    }

    @Transactional(readOnly = true)
    public RecordMonthlyResponse getMonthlyRecords(Long userId, Integer year, Integer month) {
        getUser(userId);

        YearMonth yearMonth;
        try {
            yearMonth = YearMonth.of(year, month);
        } catch (RuntimeException ex) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }

        LocalDate from = yearMonth.atDay(1);
        LocalDate to = yearMonth.atEndOfMonth();

        List<RecordListItem> items = recordRepository.findByUser_IdAndIsHiddenFalseAndRecordDateBetweenOrderByPinnedAtDescRecordDateDescIdDesc(
                userId,
                from,
                to
            )
            .stream()
            .map(this::toListItem)
            .toList();
        LocalDate firstRecordDate = recordRepository.findTopByUser_IdAndIsHiddenFalseOrderByRecordDateAscIdAsc(userId)
            .map(Record::getRecordDate)
            .orElse(null);

        int recordsCount = items.size();
        int photoCount = (int) items.stream()
            .filter(item -> item.getImageUrl() != null && !item.getImageUrl().isBlank())
            .count();
        int photoCoverage = recordsCount > 0
            ? Math.round((photoCount * 100f) / recordsCount)
            : 0;

        return RecordMonthlyResponse.builder()
            .year(yearMonth.getYear())
            .month(yearMonth.getMonthValue())
            .firstRecordYear(firstRecordDate != null ? firstRecordDate.getYear() : null)
            .firstRecordMonth(firstRecordDate != null ? firstRecordDate.getMonthValue() : null)
            .recordsCount(recordsCount)
            .photoCount(photoCount)
            .photoCoverage(photoCoverage)
            .items(items)
            .build();
    }

    @Transactional(readOnly = true)
    public RecordTodayResponse getTodayRecord(Long userId) {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        return pathRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE)
            .flatMap(activePath -> recordRepository.findByPath_IdAndRecordDateAndIsHiddenFalse(activePath.getId(), today))
            .map(record -> RecordTodayResponse.builder()
                .id(record.getId())
                .pathId(record.getPath().getId())
                .directionName(record.getPath().getDirectionName())
                .directionText(record.getPath().getDirectionText())
                .categoryCode(record.getCategoryCode())
                .recordDate(formatDate(record.getRecordDate()))
                .content(resolveContent(record))
                .oneWordText(record.getOneWordText())
                .tomorrowText(record.getTomorrowText())
                .moodCode(record.getMoodCode())
                .imageUrl(resolveImageUrl(record))
                .imagePositionX(resolvePositionX(record))
                .imagePositionY(resolvePositionY(record))
                .imageScale(resolveScale(record))
                .visibility(record.getVisibility())
                .sharedAt(record.getSharedAt() != null ? formatDateTime(record.getSharedAt()) : null)
                .createdAt(formatDateTime(record.getCreatedAt()))
                .build())
            .orElse(null);
    }

    @Transactional(readOnly = true)
    public RecordDetailResponse getRecordDetail(Long userId, Long recordId) {
        Record record = getRecord(recordId);

        boolean isOwner = record.getUser() != null
            && record.getUser().getId() != null
            && record.getUser().getId().equals(userId);

        if (!VISIBILITY_PUBLIC.equals(record.getVisibility()) && !isOwner) {
            throw new ApiException(ErrorCode.RECORD_NOT_PUBLIC);
        }

        long reactionCount = reactionRepository.countByTargetTypeAndTargetId("RECORD", record.getId());
        boolean isReacted = reactionRepository.existsByUserIdAndTargetTypeAndTargetId(userId, "RECORD", record.getId());
        long commentCount = commentRepository.countByRecordIdAndDeletedFalse(record.getId());

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
            .imageUrl(resolveImageUrl(record))
            .imagePositionX(resolvePositionX(record))
            .imagePositionY(resolvePositionY(record))
            .imageScale(resolveScale(record))
            .owner(ownerSummary)
            .reactionCount(reactionCount)
            .isReacted(isReacted)
            .commentCount(commentCount)
            .createdAt(formatDateTime(record.getCreatedAt()))
            .updatedAt(formatDateTime(record.getUpdatedAt()))
            .build();
    }

    @Transactional
    public RecordUpdateResponse updateRecord(Long userId, Long recordId, RecordUpdateRequest request) {
        return updateRecord(userId, recordId, request, RecordImageAction.KEEP, null).response();
    }

    @Transactional
    public RecordUpdateExecution updateRecord(
        Long userId,
        Long recordId,
        RecordUpdateRequest request,
        RecordImageAction imageAction,
        StoredRecordImage storedImage
    ) {
        Record record = getRecord(recordId);
        validateOwner(userId, record);
        validateEditable(record);
        String moodCode = normalizeMoodCode(request.getMoodCode());

        record.updateContent(
            request.getContent(),
            normalizeOptionalText(request.getOneWordText()),
            normalizeOptionalText(request.getTomorrowText()),
            moodCode
        );
        String previousStorageKey = applyImageChange(record, request, imageAction, storedImage);
        // 공개 글의 본문이 바뀌면 Top3 카드 내용도 stale 될 수 있다.
        if (VISIBILITY_PUBLIC.equals(record.getVisibility())) {
            weeklyTop3CacheService.evict();
        }

        RecordUpdateResponse response = RecordUpdateResponse.builder()
            .id(record.getId())
            .content(resolveContent(record))
            .oneWordText(record.getOneWordText())
            .tomorrowText(record.getTomorrowText())
            .moodCode(record.getMoodCode())
            .imageUrl(resolveImageUrl(record))
            .imagePositionX(resolvePositionX(record))
            .imagePositionY(resolvePositionY(record))
            .imageScale(resolveScale(record))
            .visibility(record.getVisibility())
            .updatedAt(formatDateTime(record.getUpdatedAt()))
            .build();
        return new RecordUpdateExecution(response, previousStorageKey);
    }

    @Transactional
    public void deleteRecord(Long userId, Long recordId) {
        Record record = getRecord(recordId);
        validateOwner(userId, record);
        record.softDelete();

        if (VISIBILITY_PUBLIC.equals(record.getVisibility())) {
            weeklyTop3CacheService.evict();
            commentPageCacheService.evictRecord(record.getId());
        }
    }

    @Transactional
    public RecordShareResponse shareRecord(Long userId, Long recordId) {
        Record record = getRecord(recordId);
        validateOwner(userId, record);
        if (VISIBILITY_PUBLIC.equals(record.getVisibility())) {
            throw new ApiException(ErrorCode.RECORD_ALREADY_SHARED);
        }
        record.share();
        // 비공개 -> 공개 전환은 Top3 후보와 댓글 접근 가능 상태를 동시에 바꾼다.
        weeklyTop3CacheService.evict();
        commentPageCacheService.evictRecord(record.getId());
        return RecordShareResponse.builder()
            .id(record.getId())
            .visibility(record.getVisibility())
            .build();
    }

    @Transactional
    public RecordVisibilityResponse updateVisibility(Long userId, Long recordId, RecordVisibilityRequest request) {
        Record record = getRecord(recordId);
        validateOwner(userId, record);

        String visibility = normalizeVisibility(request.getVisibility());
        applyVisibility(record, visibility);
        // 공개/비공개 전환 뒤에는 기존 feed/top3/comments 캐시를 신뢰하면 안 된다.
        weeklyTop3CacheService.evict();
        commentPageCacheService.evictRecord(record.getId());

        return RecordVisibilityResponse.builder()
            .id(record.getId())
            .visibility(record.getVisibility())
            .sharedAt(record.getSharedAt() != null ? formatDateTime(record.getSharedAt()) : null)
            .build();
    }

    @Transactional
    public RecordPinResponse updatePin(Long userId, Long recordId, Boolean pinned) {
        if (pinned == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        Record record = getRecord(recordId);
        validateOwner(userId, record);

        if (Boolean.TRUE.equals(pinned)) {
            record.pinMemory();
        } else {
            record.unpinMemory();
        }

        return RecordPinResponse.builder()
            .id(record.getId())
            .isPinned(record.getPinnedAt() != null)
            .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private Record getRecord(Long recordId) {
        return recordRepository.findByIdAndIsHiddenFalse(recordId)
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

    private boolean isExpired(Path activePath, LocalDate today) {
        return activePath.getReviewAt() != null
            && activePath.getReviewAt().toLocalDate().isBefore(today);
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
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

    private String resolveImageUrl(Record record) {
        RecordImage image = record.getImage();
        if (image == null) {
            return null;
        }
        return recordImageUrlResolver.resolve(image.getStorageKey(), image.getImageUrl());
    }

    private RecordListItem toListItem(Record record) {
        Path path = record.getPath();
        return RecordListItem.builder()
            .id(record.getId())
            .pathId(path != null ? path.getId() : null)
            .directionName(path != null ? path.getDirectionName() : null)
            .directionText(path != null ? path.getDirectionText() : null)
            .categoryCode(record.getCategoryCode())
            .recordDate(formatDate(record.getRecordDate()))
            .content(resolveContent(record))
            .oneWordText(record.getOneWordText())
            .tomorrowText(record.getTomorrowText())
            .moodCode(record.getMoodCode())
            .imageUrl(resolveImageUrl(record))
            .imagePositionX(resolvePositionX(record))
            .imagePositionY(resolvePositionY(record))
            .imageScale(resolveScale(record))
            .visibility(record.getVisibility())
            .isPinned(record.getPinnedAt() != null)
            .sharedAt(record.getSharedAt() != null ? formatDateTime(record.getSharedAt()) : null)
            .createdAt(formatDateTime(record.getCreatedAt()))
            .updatedAt(formatDateTime(record.getUpdatedAt()))
            .build();
    }

    private RecordImage createRecordImage(StoredRecordImage storedImage, RecordCreateRequest request) {
        return createRecordImage(
            storedImage,
            request.getImagePositionX(),
            request.getImagePositionY(),
            request.getImageScale()
        );
    }

    private RecordImage createRecordImage(StoredRecordImage storedImage, RecordUpdateRequest request) {
        return createRecordImage(
            storedImage,
            request.getImagePositionX(),
            request.getImagePositionY(),
            request.getImageScale()
        );
    }

    private RecordImage createRecordImage(
        StoredRecordImage storedImage,
        BigDecimal positionX,
        BigDecimal positionY,
        BigDecimal scale
    ) {
        return RecordImage.builder()
            .storageKey(storedImage.storageKey())
            .imageUrl(storedImage.imageUrl())
            .positionX(positionX)
            .positionY(positionY)
            .scale(scale)
            .build();
    }

    private String applyImageChange(
        Record record,
        RecordUpdateRequest request,
        RecordImageAction action,
        StoredRecordImage storedImage
    ) {
        RecordImage previousImage = record.getImage();
        String previousStorageKey = previousImage != null ? previousImage.getStorageKey() : null;

        if (action == RecordImageAction.KEEP) {
            updateExistingImagePosition(previousImage, request);
            return null;
        }
        if (action == RecordImageAction.REPLACE) {
            if (storedImage == null) {
                throw new ApiException(ErrorCode.INVALID_IMAGE_FILE);
            }
            RecordImage newImage = createRecordImage(storedImage, request);
            recordImageRepository.save(newImage);
            record.attachImage(newImage);
            if (previousImage != null) {
                recordImageRepository.delete(previousImage);
            }
            return previousStorageKey;
        }

        record.removeImage();
        if (previousImage != null) {
            recordImageRepository.delete(previousImage);
        }
        return previousStorageKey;
    }

    private void updateExistingImagePosition(RecordImage image, RecordUpdateRequest request) {
        if (image == null) {
            return;
        }
        image.updateDisplayPosition(
            request.getImagePositionX() != null ? request.getImagePositionX() : image.getPositionX(),
            request.getImagePositionY() != null ? request.getImagePositionY() : image.getPositionY(),
            request.getImageScale() != null ? request.getImageScale() : image.getScale()
        );
    }

    private BigDecimal resolvePositionX(Record record) {
        return record.getImage() != null ? record.getImage().getPositionX() : null;
    }

    private BigDecimal resolvePositionY(Record record) {
        return record.getImage() != null ? record.getImage().getPositionY() : null;
    }

    private BigDecimal resolveScale(Record record) {
        return record.getImage() != null ? record.getImage().getScale() : null;
    }

    private String formatDate(LocalDate date) {
        return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
