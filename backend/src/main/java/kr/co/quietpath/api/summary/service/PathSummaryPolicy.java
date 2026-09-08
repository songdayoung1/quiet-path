package kr.co.quietpath.api.summary.service;

import kr.co.quietpath.domain.summary.entity.PathSummary;

import java.time.Duration;
import java.time.LocalDateTime;

public final class PathSummaryPolicy {

    public static final String STATUS_LOCKED = "LOCKED";
    public static final String STATUS_EMPTY = "EMPTY";
    public static final String STATUS_READY = "READY";
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PROCESSING = "PROCESSING";
    public static final String STATUS_DONE = "DONE";
    public static final String STATUS_FAILED = "FAILED";
    public static final String PATH_STATUS_COMPLETED = "COMPLETED";
    public static final String FORMAT_JSON = "JSON";
    public static final int MAX_REGENERATION_COUNT = 3;
    public static final Duration PROCESSING_STALE_THRESHOLD = Duration.ofMinutes(10);

    private PathSummaryPolicy() {
    }

    public static boolean isInFlight(String status) {
        return STATUS_PENDING.equals(status) || STATUS_PROCESSING.equals(status);
    }

    public static boolean isStale(PathSummary summary) {
        if (summary == null || summary.getUpdatedAt() == null) {
            return false;
        }
        if (!isInFlight(summary.getStatus())) {
            return false;
        }
        return summary.getUpdatedAt().isBefore(LocalDateTime.now().minus(PROCESSING_STALE_THRESHOLD));
    }

    public static int remainingRegenerationCount(PathSummary summary) {
        int usedCount = summary == null ? 0 : summary.getRegenerationCount();
        return Math.max(0, MAX_REGENERATION_COUNT - usedCount);
    }
}
