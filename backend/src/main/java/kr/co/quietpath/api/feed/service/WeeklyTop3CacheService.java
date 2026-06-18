package kr.co.quietpath.api.feed.service;

import kr.co.quietpath.api.feed.dto.response.OwnerSummary;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseItem;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3BaseResponse;
import kr.co.quietpath.api.feed.dto.response.WeeklyTop3Window;
import kr.co.quietpath.domain.comment.repository.CommentRepository;
import kr.co.quietpath.domain.path.entity.Path;
import kr.co.quietpath.domain.reaction.repository.ReactionRepository;
import kr.co.quietpath.domain.record.entity.Record;
import kr.co.quietpath.domain.record.repository.RecordRepository;
import kr.co.quietpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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

import static kr.co.quietpath.global.config.CacheConfig.CACHE_WEEKLY_TOP3;

@Service
@RequiredArgsConstructor
public class WeeklyTop3CacheService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int TOP_LIMIT = 3;

    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    private final RecordRepository recordRepository;

    // 사용자별 reacted 여부를 제외한 "공용 Top3 본문"만 캐시한다.
    // FeedService에서 이 결과를 받아 사용자별 isReacted만 덧입힌다.
    @Cacheable(value = CACHE_WEEKLY_TOP3)
    @Transactional(readOnly = true)
    public WeeklyTop3BaseResponse getWeeklyTop3Base() {
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

        WeeklyTop3Window window = WeeklyTop3Window.builder()
            .from(from.toLocalDate().toString())
            .to(now.toLocalDate().toString())
            .build();

        List<Long> recordIds = sorted.stream()
            .map(ReactionRepository.WeeklyTop3Projection::getRecordId)
            .toList();

        if (recordIds.isEmpty()) {
            return WeeklyTop3BaseResponse.builder()
                .window(window)
                .items(List.of())
                .build();
        }

        Map<Long, Record> recordMap = recordRepository.findAllById(recordIds).stream()
            .collect(java.util.stream.Collectors.toMap(Record::getId, r -> r));

        Map<Long, Long> reactionCountMap = new HashMap<>();
        reactionRepository.countByRecordIds(recordIds)
            .forEach(row -> reactionCountMap.put(row.getRecordId(), row.getReactionCount()));

        Map<Long, Long> commentCountMap = new HashMap<>();
        commentRepository.countByRecordIds(recordIds)
            .forEach(row -> commentCountMap.put(row.getRecordId(), row.getCommentCount()));

        List<WeeklyTop3BaseItem> items = new ArrayList<>();
        for (ReactionRepository.WeeklyTop3Projection projection : sorted) {
            Record record = recordMap.get(projection.getRecordId());
            if (record == null) {
                continue;
            }
            Path path = record.getPath();
            User owner = record.getUser();

            items.add(WeeklyTop3BaseItem.builder()
                .pathId(path != null ? path.getId() : null)
                .recordId(record.getId())
                .title(path != null ? path.getDirectionName() : null)
                .content(resolveContent(record))
                .status(path != null ? mapStatus(path.getStatus()) : null)
                .owner(OwnerSummary.builder()
                    .userId(owner != null ? owner.getId() : null)
                    .nickname(owner != null ? owner.getNickname() : null)
                    .profileImageUrl(null)
                    .build())
                .categoryCode(record.getCategoryCode())
                .reactionCount(reactionCountMap.getOrDefault(record.getId(), 0L))
                .commentCount(commentCountMap.getOrDefault(record.getId(), 0L))
                .sharedAt(record.getSharedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .createdAt(record.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build());
        }

        return WeeklyTop3BaseResponse.builder()
            .window(window)
            .items(items)
            .build();
    }

    // 댓글/공감/공개 상태 변경 시 외부 서비스에서 호출하는 전용 invalidation 메서드다.
    @CacheEvict(value = CACHE_WEEKLY_TOP3, allEntries = true)
    public void evict() {
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
}
