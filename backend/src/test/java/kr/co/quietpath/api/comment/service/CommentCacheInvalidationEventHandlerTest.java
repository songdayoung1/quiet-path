package kr.co.quietpath.api.comment.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.lang.reflect.Method;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommentCacheInvalidationEventHandlerTest {

    @Mock
    private CommentPageCacheService commentPageCacheService;

    @InjectMocks
    private CommentCacheInvalidationEventHandler handler;

    @Test
    void handle_invalidatesEveryRequestedRecord() {
        handler.handle(new CommentCacheInvalidationRequestedEvent(Set.of(10L, 11L)));

        verify(commentPageCacheService).evictRecord(10L);
        verify(commentPageCacheService).evictRecord(11L);
    }

    @Test
    void handle_runsOnlyAfterCommit() throws NoSuchMethodException {
        Method method = CommentCacheInvalidationEventHandler.class.getDeclaredMethod(
            "handle",
            CommentCacheInvalidationRequestedEvent.class
        );

        TransactionalEventListener annotation = method.getAnnotation(TransactionalEventListener.class);

        assertEquals(TransactionPhase.AFTER_COMMIT, annotation.phase());
    }

    @Test
    void handle_whenOneInvalidationFails_continuesWithoutPropagating() {
        doThrow(new IllegalStateException("redis unavailable"))
            .when(commentPageCacheService).evictRecord(10L);

        assertDoesNotThrow(() -> handler.handle(
            new CommentCacheInvalidationRequestedEvent(Set.of(10L, 11L))
        ));
        verify(commentPageCacheService).evictRecord(10L);
        verify(commentPageCacheService).evictRecord(11L);
    }
}
