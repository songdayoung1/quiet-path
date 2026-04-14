package kr.co.quietpath.domain.path.entity;

import jakarta.persistence.*;
import kr.co.quietpath.domain.record.entity.Record;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "paths",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_paths_active_user", columnNames = "active_user_id")
    },
    indexes = {
        @Index(name = "idx_user_status_created", columnList = "user_id, status, created_at"),
        @Index(name = "idx_category_status_created", columnList = "category_code, status, created_at"),
        @Index(name = "idx_review_at", columnList = "review_at")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Path {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_COMPLETED = "COMPLETED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "category_code", nullable = false, length = 20)
    private String categoryCode;

    @Column(name = "direction_name", nullable = false, length = 100)
    private String directionName;

    @Column(name = "direction_text", length = 255)
    private String directionText;

    @Column(name = "review_at", nullable = false)
    private LocalDateTime reviewAt;

    @Column(nullable = false, length = 20)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_record_id")
    private Record coverRecord;

    @Column(name = "active_user_id", insertable = false, updatable = false)
    private Long activeUserId;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Path(
        Long userId,
        String categoryCode,
        String directionName,
        String directionText,
        LocalDateTime reviewAt
    ) {
        this.userId = userId;
        this.categoryCode = categoryCode;
        this.directionName = directionName;
        this.directionText = directionText;
        this.reviewAt = reviewAt;
        this.status = STATUS_ACTIVE;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void complete() {
        if (STATUS_COMPLETED.equals(this.status)) {
            throw new IllegalStateException("이미 종료된 방향입니다.");
        }
        this.status = STATUS_COMPLETED;
        this.completedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void assignCoverRecord(Record coverRecord) {
        this.coverRecord = coverRecord;
        this.updatedAt = LocalDateTime.now();
    }

    public void clearCoverRecord() {
        this.coverRecord = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDirectionName(String directionName) {
        this.directionName = directionName;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDirectionText(String directionText) {
        this.directionText = directionText;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateReviewAt(LocalDateTime reviewAt) {
        this.reviewAt = reviewAt;
        this.updatedAt = LocalDateTime.now();
    }
}
