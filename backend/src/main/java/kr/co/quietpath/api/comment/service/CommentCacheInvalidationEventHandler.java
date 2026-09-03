package kr.co.quietpath.api.comment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import static kr.co.quietpath.global.config.CacheConfig.COMMENTS_TTL;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommentCacheInvalidationEventHandler {

    private final CommentPageCacheService commentPageCacheService;

    // 비동기 처리보다 DB commit 이후라는 실행 순서가 중요하므로 @Async를 사용하지 않는다.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(CommentCacheInvalidationRequestedEvent event) {
        event.recordIds().forEach(recordId -> {
            try {
                commentPageCacheService.evictRecord(recordId);
            } catch (RuntimeException exception) {
                // DB 변경은 이미 commit됐으므로 캐시 장애를 요청 실패로 되돌리지 않는다.
                // 기존 댓글 페이지는 COMMENTS_TTL 동안 남을 수 있으며 DB가 원본 상태를 유지한다.
                log.warn(
                    "Comment cache invalidation failed after commit; stale cache may remain until TTL: recordId={}, ttlMinutes={}",
                    recordId,
                    COMMENTS_TTL.toMinutes(),
                    exception
                );
            }
        });
    }
}
