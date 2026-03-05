package kr.co.quietpath.domain.path.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "paths", indexes = {
    @Index(name = "idx_user_status_anchor", columnList = "user_id, status, anchor_at"),
    @Index(name = "idx_category_status_anchor", columnList = "category_code, status, anchor_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Path {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String categoryCode;

    @Column(nullable = false, length = 255)
    private String keyQuestion;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private LocalDateTime startAt;

    @Column(nullable = false)
    private LocalDateTime anchorAt;

    @Column(nullable = false, length = 20)
    private String status;

    @Column
    private LocalDateTime closedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Path(
        Long userId,
        String categoryCode,
        String keyQuestion,
        String name,
        String description,
        LocalDateTime anchorAt
    ) {
        this.userId = userId;
        this.categoryCode = categoryCode;
        this.keyQuestion = keyQuestion;
        this.name = name;
        this.description = description;
        this.startAt = LocalDateTime.now();
        this.anchorAt = anchorAt;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void close() {
        if ("FINISHED".equals(this.status)) {
            throw new IllegalStateException("이미 종료된 방향입니다.");
        }
        this.status = "FINISHED";
        this.closedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void updateName(String name) {
        this.name = name;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDescription(String description) {
        this.description = description;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateAnchor(LocalDateTime anchorAt) {
        this.anchorAt = anchorAt;
        this.updatedAt = LocalDateTime.now();
    }
}
