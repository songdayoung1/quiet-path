package kr.co.quietpath.api.feed.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.feed.dto.response.OwnerSummary;
import kr.co.quietpath.api.feed.dto.response.FeedItem;
import kr.co.quietpath.api.feed.dto.response.FeedResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseItem;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Item;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Response;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedService {

    private static final int MAX_FEED_SIZE = 50;
    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final Set<String> ALLOWED_CATEGORY_CODES = Set.of("job", "study", "workout", "hobby", "cert");

    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    private final RecordRepository recordRepository;
    private final WeeklyTop3CacheService weeklyTop3CacheService;

    public FeedResponse getFeed(Long userId, String category, int size, String cursor) {
        int pageSize = normalizeSize(size);
        String normalizedCategory = normalizeCategory(category);
        LocalDateTime cursorSharedAt = null;
        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            String[] parts = cursor.split("_");
            if (parts.length != 2) {
                throw new ApiException(ErrorCode.INVALID_CURSOR);
            }
            try {
                cursorSharedAt = LocalDateTime.parse(parts[0], DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                cursorId = Long.parseLong(parts[1]);
            } catch (Exception e) {
                throw new ApiException(ErrorCode.INVALID_CURSOR);
            }
        }

        List<Record> records = recordRepository.findPublicFeedRecords(
            VISIBILITY_PUBLIC,
            normalizedCategory,
            cursorSharedAt,
            cursorId,
            org.springframework.data.domain.PageRequest.of(0, pageSize + 1)
        );

        boolean hasNext = records.size() > pageSize;
        if (hasNext) {
            records = records.subList(0, pageSize);
        }

        if (records.isEmpty()) {
            return FeedResponse.builder()
                .items(List.of())
                .hasNext(false)
                .nextCursor(null)
                .build();
        }

        List<Long> recordIds = records.stream()
            .map(Record::getId)
            .toList();

        Map<Long, Long> reactionCountMap = new HashMap<>();
        reactionRepository.countByRecordIds(recordIds)
            .forEach(row -> reactionCountMap.put(row.getRecordId(), row.getReactionCount()));

        Map<Long, Long> commentCountMap = new HashMap<>();
        commentRepository.countByRecordIds(recordIds)
            .forEach(row -> commentCountMap.put(row.getRecordId(), row.getCommentCount()));

        Set<Long> reactedRecordIds = userId == null
            ? Set.of()
            : reactionRepository.findReactedRecordIds(userId, recordIds).stream()
                .collect(Collectors.toSet());

        List<FeedItem> items = new ArrayList<>();
        for (Record record : records) {
            Path path = record.getPath();
            User owner = record.getUser();
            OwnerSummary ownerSummary = OwnerSummary.builder()
                .userId(owner != null ? owner.getId() : null)
                .nickname(owner != null ? owner.getNickname() : null)
                .profileImageUrl(null)
                .build();

            long reactionCount = reactionCountMap.getOrDefault(record.getId(), 0L);
            items.add(FeedItem.builder()
                .pathId(path != null ? path.getId() : null)
                .recordId(record.getId())
                .title(path != null ? path.getDirectionName() : null)
                .content(resolveContent(record))
                .status(path != null ? mapStatus(path.getStatus()) : null)
                .owner(ownerSummary)
                .categoryCode(record.getCategoryCode())
                .reactionCount(reactionCount)
                .commentCount(commentCountMap.getOrDefault(record.getId(), 0L))
                .isReacted(reactedRecordIds.contains(record.getId()))
                .sharedAt(formatDateTime(record.getSharedAt()))
                .createdAt(formatDateTime(record.getCreatedAt()))
                .build());
        }

        Record lastRecord = records.get(records.size() - 1);
        String nextCursor = hasNext
            ? formatDateTime(lastRecord.getSharedAt()) + "_" + lastRecord.getId()
            : null;

        return FeedResponse.builder()
            .items(items)
            .hasNext(hasNext)
            .nextCursor(nextCursor)
            .build();
    }

    public WeeklyTop3Response getWeeklyTop3(Long userId) {
        WeeklyTop3BaseResponse base = weeklyTop3CacheService.getWeeklyTop3Base();

        List<Long> recordIds = base.getItems().stream()
            .map(WeeklyTop3BaseItem::getRecordId)
            .toList();

        Set<Long> reactedRecordIds = (userId == null || recordIds.isEmpty())
            ? Set.of()
            : reactionRepository.findReactedRecordIds(userId, recordIds).stream()
                .collect(Collectors.toSet());

        List<WeeklyTop3Item> items = base.getItems().stream()
            .map(baseItem -> WeeklyTop3Item.builder()
                .pathId(baseItem.getPathId())
                .recordId(baseItem.getRecordId())
                .title(baseItem.getTitle())
                .content(baseItem.getContent())
                .status(baseItem.getStatus())
                .owner(baseItem.getOwner())
                .categoryCode(baseItem.getCategoryCode())
                .reactionCount(baseItem.getReactionCount())
                .commentCount(baseItem.getCommentCount())
                .isReacted(reactedRecordIds.contains(baseItem.getRecordId()))
                .sharedAt(baseItem.getSharedAt())
                .createdAt(baseItem.getCreatedAt())
                .build())
            .toList();

        return WeeklyTop3Response.builder()
            .window(base.getWindow())
            .items(items)
            .build();
    }

    private String mapStatus(String status) {
        if ("FINISHED".equals(status) || "CLOSED".equals(status) || "COMPLETED".equals(status)) {
            return "ENDED";
        }
        return status;
    }

    private String resolveContent(Record record) {
        if (record.getSceneText() != null && !record.getSceneText().isBlank()) {
            return record.getSceneText();
        }
        return record.getOneWordText();
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank() || "all".equalsIgnoreCase(category)) {
            return null;
        }

        String normalized = category.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CATEGORY_CODES.contains(normalized)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST);
        }
        return normalized;
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, MAX_FEED_SIZE);
    }

}
