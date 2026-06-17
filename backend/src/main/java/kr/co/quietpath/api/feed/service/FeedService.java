package kr.co.quietpath.api.feed.service;

import kr.co.quietpath.api.common.error.ApiException;
import kr.co.quietpath.api.common.error.ErrorCode;
import kr.co.quietpath.api.feed.dto.response.OwnerSummary;
import kr.co.quietpath.api.feed.dto.response.FeedItem;
import kr.co.quietpath.api.feed.dto.response.FeedResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Item;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Response;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Window;
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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
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

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int TOP_LIMIT = 3;
    private static final int MAX_FEED_SIZE = 50;
    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final Set<String> ALLOWED_CATEGORY_CODES = Set.of("job", "study", "workout", "hobby", "cert");

    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    private final RecordRepository recordRepository;

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
        LocalDateTime now = LocalDateTime.now(KST);
        LocalDateTime from = now.minusDays(7);

        List<ReactionRepository.WeeklyTop3Projection> candidates =
            reactionRepository.findWeeklyTop3Candidates(from, now);

        List<ReactionRepository.WeeklyTop3Projection> sorted = candidates.stream()
            .sorted(Comparator
                .comparing(ReactionRepository.WeeklyTop3Projection::getReactionCount).reversed()
                .thenComparing(ReactionRepository.WeeklyTop3Projection::getReactedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ReactionRepository.WeeklyTop3Projection::getRecordId, Comparator.nullsLast(Comparator.reverseOrder()))
            )
            .limit(TOP_LIMIT)
            .toList();

        List<Long> recordIds = sorted.stream()
            .map(ReactionRepository.WeeklyTop3Projection::getRecordId)
            .toList();

        if (recordIds.isEmpty()) {
            WeeklyTop3Window window = WeeklyTop3Window.builder()
                .from(from.toLocalDate().toString())
                .to(now.toLocalDate().toString())
                .build();
            return WeeklyTop3Response.builder()
                .window(window)
                .items(List.of())
                .build();
        }

        Map<Long, Record> recordMap = recordRepository.findAllById(recordIds).stream()
            .collect(Collectors.toMap(Record::getId, record -> record));

        Map<Long, Long> reactionCountMap = new HashMap<>();
        reactionRepository.countByRecordIds(recordIds)
            .forEach(row -> reactionCountMap.put(row.getRecordId(), row.getReactionCount()));

        Map<Long, Long> commentCountMap = new HashMap<>();
        commentRepository.countByRecordIds(recordIds)
            .forEach(row -> commentCountMap.put(row.getRecordId(), row.getCommentCount()));

        Set<Long> reactedRecordIds = recordIds.isEmpty() || userId == null
            ? Set.of()
            : reactionRepository.findReactedRecordIds(userId, recordIds).stream()
                .collect(Collectors.toSet());

        List<WeeklyTop3Item> items = new ArrayList<>();
        for (ReactionRepository.WeeklyTop3Projection projection : sorted) {
            Record record = recordMap.get(projection.getRecordId());
            if (record == null) {
                continue;
            }
            kr.co.quietpath.domain.path.entity.Path path = record.getPath();
            User owner = record.getUser();
            OwnerSummary ownerSummary = OwnerSummary.builder()
                .userId(owner != null ? owner.getId() : null)
                .nickname(owner != null ? owner.getNickname() : null)
                .profileImageUrl(null)
                .build();

            WeeklyTop3Item item = WeeklyTop3Item.builder()
                .pathId(path != null ? path.getId() : null)
                .recordId(record.getId())
                .title(path != null ? path.getDirectionName() : null)
                .content(resolveContent(record))
                .status(path != null ? mapStatus(path.getStatus()) : null)
                .owner(ownerSummary)
                .categoryCode(record.getCategoryCode())
                .reactionCount(reactionCountMap.getOrDefault(record.getId(), 0L))
                .commentCount(commentCountMap.getOrDefault(record.getId(), 0L))
                .isReacted(reactedRecordIds.contains(record.getId()))
                .sharedAt(formatDateTime(record.getSharedAt()))
                .createdAt(formatDateTime(record.getCreatedAt()))
                .build();
            items.add(item);
        }

        WeeklyTop3Window window = WeeklyTop3Window.builder()
            .from(from.toLocalDate().toString())
            .to(now.toLocalDate().toString())
            .build();

        return WeeklyTop3Response.builder()
            .window(window)
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
