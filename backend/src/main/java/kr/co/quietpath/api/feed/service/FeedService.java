package kr.co.quietpath.api.feed.service;

import kr.co.quietpath.api.feed.dto.response.OwnerSummary;
import kr.co.quietpath.api.feed.dto.response.FeedItem;
import kr.co.quietpath.api.feed.dto.response.FeedResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Item;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Response;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Window;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.path.repository.PathRepository;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.user.repository.UserRepository;
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

    private final ReactionRepository reactionRepository;
    private final PathRepository pathRepository;
    private final UserRepository userRepository;
    private final RecordRepository recordRepository;

    public FeedResponse getFeed(Long userId, int size, String cursor) {
        int pageSize = normalizeSize(size);
        LocalDateTime cursorCreatedAt = null;
        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            String[] parts = cursor.split("_");
            if (parts.length != 2) {
                throw new kr.co.quietpath.api.common.error.ApiException(
                    kr.co.quietpath.api.common.error.ErrorCode.INVALID_CURSOR
                );
            }
            try {
                cursorCreatedAt = LocalDateTime.parse(parts[0], DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                cursorId = Long.parseLong(parts[1]);
            } catch (Exception e) {
                throw new kr.co.quietpath.api.common.error.ApiException(
                    kr.co.quietpath.api.common.error.ErrorCode.INVALID_CURSOR
                );
            }
        }

        List<Record> records = recordRepository.findPublicFeedRecords(
            VISIBILITY_PUBLIC,
            cursorCreatedAt,
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

        Set<Long> reactedRecordIds = reactionRepository.findReactedRecordIds(userId, recordIds).stream()
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
                .reactionCount(reactionCount)
                .isReacted(reactedRecordIds.contains(record.getId()))
                .createdAt(formatDateTime(record.getCreatedAt()))
                .build());
        }

        Record lastRecord = records.get(records.size() - 1);
        String nextCursor = hasNext
            ? formatDateTime(lastRecord.getCreatedAt()) + "_" + lastRecord.getId()
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
                .thenComparing(ReactionRepository.WeeklyTop3Projection::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ReactionRepository.WeeklyTop3Projection::getPathId, Comparator.nullsLast(Comparator.reverseOrder()))
            )
            .limit(TOP_LIMIT)
            .toList();

        List<Long> pathIds = sorted.stream()
            .map(ReactionRepository.WeeklyTop3Projection::getPathId)
            .toList();

        if (pathIds.isEmpty()) {
            WeeklyTop3Window window = WeeklyTop3Window.builder()
                .from(from.toLocalDate().toString())
                .to(now.toLocalDate().toString())
                .build();
            return WeeklyTop3Response.builder()
                .window(window)
                .items(List.of())
                .build();
        }

        Map<Long, Path> pathMap = pathRepository.findByIdIn(pathIds).stream()
            .collect(Collectors.toMap(Path::getId, path -> path));

        List<Long> ownerIds = pathMap.values().stream()
            .map(Path::getUserId)
            .distinct()
            .toList();

        Map<Long, User> userMap = ownerIds.isEmpty()
            ? Map.of()
            : userRepository.findByIdIn(ownerIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        Set<Long> reactedPathIds = pathIds.isEmpty()
            ? Set.of()
            : reactionRepository.findReactedPathIds(userId, pathIds).stream()
                .collect(Collectors.toSet());

        List<WeeklyTop3Item> items = new ArrayList<>();
        int rank = 1;
        for (ReactionRepository.WeeklyTop3Projection projection : sorted) {
            Path path = pathMap.get(projection.getPathId());
            if (path == null) {
                continue;
            }
            User owner = userMap.get(path.getUserId());
            OwnerSummary ownerSummary = OwnerSummary.builder()
                .userId(owner != null ? owner.getId() : null)
                .nickname(owner != null ? owner.getNickname() : null)
                .profileImageUrl(null)
                .build();

            WeeklyTop3Item item = WeeklyTop3Item.builder()
                .rank(rank)
                .pathId(path.getId())
                .title(path.getDirectionName())
                .status(mapStatus(path.getStatus()))
                .owner(ownerSummary)
                .reactionCount(projection.getReactionCount())
                .isReacted(reactedPathIds.contains(path.getId()))
                .createdAt(formatDateTime(path.getCreatedAt()))
                .updatedAt(formatDateTime(path.getUpdatedAt()))
                .build();
            items.add(item);
            rank++;
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

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, MAX_FEED_SIZE);
    }
}
