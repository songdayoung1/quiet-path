package kr.co.quietpath.api.comment.service;

import java.util.Collection;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public record CommentCacheInvalidationRequestedEvent(Set<Long> recordIds) {

    public CommentCacheInvalidationRequestedEvent {
        recordIds = recordIds == null
            ? Set.of()
            : recordIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toUnmodifiableSet());
    }

    public static CommentCacheInvalidationRequestedEvent forRecord(Long recordId) {
        return new CommentCacheInvalidationRequestedEvent(Set.of(recordId));
    }

    public static CommentCacheInvalidationRequestedEvent forRecords(Collection<Long> recordIds) {
        return new CommentCacheInvalidationRequestedEvent(Set.copyOf(recordIds));
    }
}
