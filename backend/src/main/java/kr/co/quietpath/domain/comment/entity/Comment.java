package kr.co.quietpath.domain.comment.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments", indexes = {
    @Index(name = "idx_comments_record_created", columnList = "record_id, created_at"),
    @Index(name = "idx_comments_user_created", columnList = "user_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_id", nullable = false)
    private Long recordId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(nullable = false)
    private boolean deleted;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime deletedAt;

    @Builder
    public Comment(Long recordId, Long userId, String content) {
        this.recordId = recordId;
        this.userId = userId;
        this.content = content;
        this.deleted = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void updateContent(String content) {
        this.content = content;
        this.updatedAt = LocalDateTime.now();
    }

    public void softDelete() {
        if (!this.deleted) {
            this.deleted = true;
            this.deletedAt = LocalDateTime.now();
            this.updatedAt = LocalDateTime.now();
        }
    }

    public void anonymizeAuthor() {
        if (this.userId != null) {
            this.userId = null;
            this.updatedAt = LocalDateTime.now();
        }
    }
}
