package kr.co.quietpath.domain.auth.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class RefreshTokenSessionTest {

    @Test
    void issue_setsIdAndTtlSeconds() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-token",
            900L
        );

        assertNotNull(session.getId());
        assertEquals(1L, session.getUserId());
        assertEquals("session-1", session.getSessionId());
        assertEquals("hashed-token", session.getTokenHash());
        assertEquals(900L, session.getTtlSeconds());
        assertNotNull(session.getCreatedAt());
    }

    @Test
    void rotate_updatesTokenHashAndTtlSeconds() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-token",
            900L
        );

        session.rotate("hashed-next-token", 1_800L);

        assertNotEquals("hashed-token", session.getTokenHash());
        assertEquals("hashed-next-token", session.getTokenHash());
        assertEquals(1_800L, session.getTtlSeconds());
    }

    @Test
    void issue_nonPositiveTtl_rejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            RefreshTokenSession.issue(1L, "session-1", "hashed-token", 0L)
        );

        assertEquals("ttlSeconds는 0보다 커야 합니다.", ex.getMessage());
    }

    @Test
    void rotate_nonPositiveTtl_rejected() {
        RefreshTokenSession session = RefreshTokenSession.issue(
            1L,
            "session-1",
            "hashed-token",
            900L
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            session.rotate("hashed-next-token", -1L)
        );

        assertEquals("ttlSeconds는 0보다 커야 합니다.", ex.getMessage());
    }
}
