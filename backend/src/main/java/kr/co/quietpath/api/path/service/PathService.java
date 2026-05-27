package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.request.PathCreateRequest;
import kr.co.quietpath.api.path.dto.response.*;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.summary.entity.PathSummary;
import kr.co.quietpath.domain.summary.repository.PathSummaryRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Set;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PathService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String SUMMARY_STATUS_DONE = "DONE";
    private static final String SUMMARY_STATUS_LOCKED = "LOCKED";
    private static final String SUMMARY_STATUS_UNLOCKED = "UNLOCKED";
    private static final Set<String> ALLOWED_CATEGORY_CODES = Set.of("job", "study", "workout", "hobby", "cert");

    private final PathRepository pathRepository;
    private final UserRepository userRepository;
    private final RecordRepository recordRepository;
    private final PathSummaryRepository pathSummaryRepository;

    @Transactional(readOnly = true)
    public PathActiveResponse getActivePath(Long userId) {
        getUser(userId);
        Path currentPath = pathRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE)
            .orElse(null);
        if (currentPath == null) {
            return PathActiveResponse.empty();
        }
        return PathActiveResponse.builder()
            .pathId(currentPath.getId())
            .categoryCode(currentPath.getCategoryCode())
            .directionName(currentPath.getDirectionName())
            .directionText(currentPath.getDirectionText())
            .status(currentPath.getStatus())
            .createdAt(formatDate(currentPath.getCreatedAt()))
            .reviewAt(formatDate(currentPath.getReviewAt()))
            .build();
    }

    public PathCreateResponse createPath(Long userId, PathCreateRequest request) {
        getUser(userId);
        if (pathRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE).isPresent()) {
            throw new ApiException(ErrorCode.PATH_ALREADY_ACTIVE);
        }
        LocalDate createdAt = LocalDate.now();
        LocalDate reviewAt = resolveReviewAt(request, createdAt);
        String categoryCode = normalizeCategoryCode(request.getCategoryCode());

        Path path = Path.builder()
            .userId(userId)
            .categoryCode(categoryCode)
            .directionName(request.getDirectionName())
            .directionText(request.getDirectionText())
            .reviewAt(reviewAt.atStartOfDay())
            .build();

        try {
            pathRepository.saveAndFlush(path);
        } catch (DataIntegrityViolationException ex) {
            if (isActivePathUniqueViolation(ex)) {
                throw new ApiException(ErrorCode.PATH_ALREADY_ACTIVE);
            }
            throw ex;
        }

        return PathCreateResponse.builder()
            .pathId(path.getId())
            .categoryCode(path.getCategoryCode())
            .status(path.getStatus())
            .createdAt(createdAt.toString())
            .reviewAt(reviewAt.toString())
            .build();
    }

    public PathFinishResponse finishPath(Long userId, Long pathId) {
        getUser(userId);
        Path currentPath = pathRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE)
            .orElseThrow(() -> new ApiException(ErrorCode.PATH_NOT_ACTIVE));
        if (currentPath == null) {
            throw new ApiException(ErrorCode.PATH_NOT_ACTIVE);
        }
        if (currentPath.getId() == null || !currentPath.getId().equals(pathId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
        if (!STATUS_ACTIVE.equals(currentPath.getStatus())) {
            throw new ApiException(ErrorCode.PATH_NOT_ACTIVE);
        }
        currentPath.complete();
        pathRepository.save(currentPath);

        return PathFinishResponse.builder()
            .pathId(currentPath.getId())
            .status(currentPath.getStatus())
            .completedAt(formatInstant(currentPath.getCompletedAt()))
            .build();
    }

    @Transactional(readOnly = true)
    public PathListResponse getPastPaths(Long userId, String cursor, int size) {
        LocalDateTime cursorTime = null;
        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            String[] parts = cursor.split(",");
            if (parts.length != 2) {
                throw new ApiException(ErrorCode.INVALID_CURSOR);
            }
            try {
                Instant instant = Instant.parse(parts[0]);
                cursorTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
                cursorId = Long.parseLong(parts[1]);
            } catch (Exception e) {
                throw new ApiException(ErrorCode.INVALID_CURSOR);
            }
        }

        Pageable pageable = PageRequest.of(0, size);
        List<Path> paths = pathRepository.findFinishedPathsWithCursor(
            userId,
            STATUS_COMPLETED,
            cursorTime,
            cursorId,
            pageable
        );

        List<PathListItem> items = new ArrayList<>();
        for (Path path : paths) {
            items.add(PathListItem.builder()
                .pathId(path.getId())
                .createdAt(formatDate(path.getCreatedAt()))
                .completedAt(formatNullableDate(path.getCompletedAt()))
                .directionName(path.getDirectionName())
                .build());
        }

        String nextCursor = null;
        if (!paths.isEmpty()) {
            Path last = paths.get(paths.size() - 1);
            if (last.getCompletedAt() != null) {
                nextCursor = formatInstant(last.getCompletedAt()) + "," + last.getId();
            }
        }

        return PathListResponse.builder()
            .items(items)
            .nextCursor(nextCursor)
            .build();
    }

    @Transactional(readOnly = true)
    public PathDetailResponse getPathDetail(Long userId, Long pathId) {
        Path path = pathRepository.findById(pathId)
            .orElseThrow(() -> new ApiException(ErrorCode.PATH_NOT_FOUND));
        if (!path.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }

        LocalDate unlockAtDate = path.getReviewAt().toLocalDate();

        String summary = null;
        String summaryStatus = resolveSummaryStatus(path.getId(), unlockAtDate);
        if (SUMMARY_STATUS_DONE.equals(summaryStatus)) {
            summary = findLatestSummary(path.getId());
        }

        List<Record> records = recordRepository.findAllByPath_IdOrderByRecordDateAsc(pathId);
        List<PathRecordItem> recordItems = new ArrayList<>();
        for (Record record : records) {
            recordItems.add(PathRecordItem.builder()
                .recordId(record.getId())
                .date(record.getRecordDate().toString())
                .preview(resolvePreview(record))
                .moodText(record.getMoodCode())
                .build());
        }

        return PathDetailResponse.builder()
            .pathId(path.getId())
            .directionName(path.getDirectionName())
            .directionText(path.getDirectionText())
            .status(path.getStatus())
            .createdAt(formatDate(path.getCreatedAt()))
            .reviewAt(path.getReviewAt().toLocalDate().toString())
            .completedAt(formatNullableDate(path.getCompletedAt()))
            .summary(summary)
            .summaryStatus(summaryStatus)
            .records(recordItems)
            .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private boolean isActivePathUniqueViolation(DataIntegrityViolationException ex) {
        Throwable cause = ex.getMostSpecificCause();
        String message = cause == null ? ex.getMessage() : cause.getMessage();
        return message != null && message.contains("uk_paths_active_user");
    }

    private LocalDate resolveReviewAt(PathCreateRequest request, LocalDate createdAt) {
        if (request.getReviewAt() == null) {
            throw new ApiException(ErrorCode.INVALID_PERIOD);
        }
        if (!request.getReviewAt().isAfter(createdAt)) {
            throw new ApiException(ErrorCode.INVALID_PERIOD);
        }
        return request.getReviewAt();
    }

    private String normalizeCategoryCode(String categoryCode) {
        if (categoryCode == null || categoryCode.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        if (!ALLOWED_CATEGORY_CODES.contains(categoryCode)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return categoryCode;
    }

    private String resolveSummaryStatus(Long pathId, LocalDate unlockAtDate) {
        if (LocalDate.now().isBefore(unlockAtDate)) {
            return SUMMARY_STATUS_LOCKED;
        }
        List<PathSummary> summaries = pathSummaryRepository.findByPathIdOrderByVersionNoDesc(pathId);
        if (!summaries.isEmpty()) {
            PathSummary latest = summaries.get(0);
            if (SUMMARY_STATUS_DONE.equals(latest.getStatus())) {
                return SUMMARY_STATUS_DONE;
            }
        }
        return SUMMARY_STATUS_UNLOCKED;
    }

    private String findLatestSummary(Long pathId) {
        List<PathSummary> summaries = pathSummaryRepository.findByPathIdOrderByVersionNoDesc(pathId);
        if (summaries.isEmpty()) {
            return null;
        }
        return summaries.get(0).getContent();
    }

    private String resolvePreview(Record record) {
        if (record.getSceneText() != null && !record.getSceneText().isBlank()) {
            return record.getSceneText();
        }
        return record.getOneWordText();
    }

    private String formatDate(LocalDateTime dateTime) {
        return dateTime.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String formatNullableDate(LocalDateTime dateTime) {
        if (dateTime == null) {
            return null;
        }
        return formatDate(dateTime);
    }

    private String formatDate(LocalDate date) {
        return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String formatInstant(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault()).toInstant().toString();
    }
}
