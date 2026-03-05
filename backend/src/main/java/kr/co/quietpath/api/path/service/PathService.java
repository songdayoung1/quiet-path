package kr.co.quietpath.api.path.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.path.dto.request.DurationType;
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
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PathService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_FINISHED = "FINISHED";
    private static final String SUMMARY_STATUS_DONE = "DONE";
    private static final String SUMMARY_STATUS_LOCKED = "LOCKED";
    private static final String SUMMARY_STATUS_UNLOCKED = "UNLOCKED";
    private static final String DEFAULT_CATEGORY_CODE = "DEFAULT";

    private final PathRepository pathRepository;
    private final UserRepository userRepository;
    private final RecordRepository recordRepository;
    private final PathSummaryRepository pathSummaryRepository;

    @Transactional(readOnly = true)
    public PathActiveResponse getActivePath(Long userId) {
        User user = getUser(userId);
        Path currentPath = user.getCurrentPath();
        if (currentPath == null) {
            return PathActiveResponse.empty();
        }
        return PathActiveResponse.builder()
            .pathId(currentPath.getId())
            .keyQuestion(currentPath.getKeyQuestion())
            .description(currentPath.getDescription())
            .status(currentPath.getStatus())
            .startDate(formatDate(currentPath.getStartAt()))
            .endDate(formatDate(resolveEndDate(currentPath)))
            .build();
    }

    public PathCreateResponse createPath(Long userId, PathCreateRequest request) {
        User user = getUser(userId);
        if (user.getCurrentPath() != null) {
            throw new ApiException(ErrorCode.PATH_ALREADY_ACTIVE);
        }
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = resolveEndDate(request, startDate);

        Path path = Path.builder()
            .userId(userId)
            .categoryCode(DEFAULT_CATEGORY_CODE)
            .keyQuestion(request.getKeyQuestion())
            .name(request.getKeyQuestion())
            .description(request.getDescription())
            .anchorAt(endDate.atStartOfDay())
            .build();

        pathRepository.save(path);
        user.setActivePath(path);
        userRepository.save(user);

        return PathCreateResponse.builder()
            .pathId(path.getId())
            .status(path.getStatus())
            .startDate(startDate.toString())
            .endDate(endDate.toString())
            .build();
    }

    public PathFinishResponse finishPath(Long userId, Long pathId) {
        User user = getUser(userId);
        Path currentPath = user.getCurrentPath();
        if (currentPath == null) {
            throw new ApiException(ErrorCode.PATH_NOT_ACTIVE);
        }
        if (currentPath.getId() == null || !currentPath.getId().equals(pathId)) {
            throw new ApiException(ErrorCode.NOT_OWNER);
        }
        if (!STATUS_ACTIVE.equals(currentPath.getStatus())) {
            throw new ApiException(ErrorCode.PATH_NOT_ACTIVE);
        }
        currentPath.close();
        user.clearActivePath();
        pathRepository.save(currentPath);
        userRepository.save(user);

        return PathFinishResponse.builder()
            .pathId(currentPath.getId())
            .status(currentPath.getStatus())
            .finishedAt(formatInstant(currentPath.getClosedAt()))
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
            STATUS_FINISHED,
            cursorTime,
            cursorId,
            pageable
        );

        List<PathListItem> items = new ArrayList<>();
        for (Path path : paths) {
            items.add(PathListItem.builder()
                .pathId(path.getId())
                .startDate(formatDate(path.getStartAt()))
                .endDate(formatDate(resolveEndDate(path)))
                .keyQuestion(path.getKeyQuestion())
                .build());
        }

        String nextCursor = null;
        if (!paths.isEmpty()) {
            Path last = paths.get(paths.size() - 1);
            if (last.getClosedAt() != null) {
                nextCursor = formatInstant(last.getClosedAt()) + "," + last.getId();
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

        LocalDate startDate = path.getStartAt().toLocalDate();
        LocalDate endDate = resolveEndDate(path);
        LocalDate unlockAtDate = path.getAnchorAt().toLocalDate();

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
            .keyQuestion(path.getKeyQuestion())
            .description(path.getDescription())
            .status(path.getStatus())
            .period(PathDetailResponse.Period.builder()
                .startDate(startDate.toString())
                .endDate(endDate.toString())
                .build())
            .summary(summary)
            .summaryStatus(summaryStatus)
            .unlockAt(unlockAtDate.toString())
            .records(recordItems)
            .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private LocalDate resolveEndDate(PathCreateRequest request, LocalDate startDate) {
        if (request.getDurationType() == null) {
            throw new ApiException(ErrorCode.INVALID_PERIOD);
        }
        if (request.getDurationType() == DurationType.CUSTOM) {
            if (request.getEndDate() == null) {
                throw new ApiException(ErrorCode.INVALID_PERIOD);
            }
            if (!request.getEndDate().isAfter(startDate)) {
                throw new ApiException(ErrorCode.INVALID_PERIOD);
            }
            return request.getEndDate();
        }
        return switch (request.getDurationType()) {
            case DAYS_7 -> startDate.plusDays(7);
            case DAYS_30 -> startDate.plusDays(30);
            case DAYS_90 -> startDate.plusDays(90);
            case CUSTOM -> request.getEndDate();
        };
    }

    private LocalDate resolveEndDate(Path path) {
        if (path.getClosedAt() != null) {
            return path.getClosedAt().toLocalDate();
        }
        return path.getAnchorAt().toLocalDate();
    }

    private String resolveSummaryStatus(Long pathId, LocalDate unlockAtDate) {
        List<PathSummary> summaries = pathSummaryRepository.findByPathIdOrderByUpdatedAtDesc(pathId);
        if (!summaries.isEmpty()) {
            PathSummary latest = summaries.get(0);
            if (SUMMARY_STATUS_DONE.equals(latest.getStatus())) {
                return SUMMARY_STATUS_DONE;
            }
        }
        if (LocalDate.now().isBefore(unlockAtDate)) {
            return SUMMARY_STATUS_LOCKED;
        }
        return SUMMARY_STATUS_UNLOCKED;
    }

    private String findLatestSummary(Long pathId) {
        List<PathSummary> summaries = pathSummaryRepository.findByPathIdOrderByUpdatedAtDesc(pathId);
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

    private String formatDate(LocalDate date) {
        return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String formatInstant(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault()).toInstant().toString();
    }
}
