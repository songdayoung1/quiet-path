package kr.co.quietpath.domain.record.entity;

import jakarta.persistence.*;
import kr.co.quietpath.domain.user.entity.User;
import kr.co.quietpath.domain.path.entity.Path;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "records",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_path_date", columnNames = {"path_id", "record_date"}),
        @UniqueConstraint(name = "uk_records_share_code", columnNames = {"share_code"})
    },
    indexes = {
        @Index(name = "idx_user_record_date_id", columnList = "user_id, record_date, id"),
        @Index(name = "idx_path_date", columnList = "path_id, record_date"),
        @Index(name = "idx_visibility_category_shared", columnList = "visibility, category_code, shared_at, id"),
        @Index(name = "idx_mood_date", columnList = "mood_code, record_date")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Record {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "path_id", nullable = false)
    private Path path;

    @Column(name = "category_code", nullable = false, length = 20)
    private String categoryCode;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(length = 500)
    private String sceneText;

    @Column(name = "one_word_text", length = 200)
    private String oneWordText;

    @Column(name = "tomorrow_text", length = 200)
    private String tomorrowText;

    @Column(name = "mood_code", length = 30)
    private String moodCode;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_hidden", nullable = false)
    private Boolean isHidden;

    @Column(name = "pinned_at")
    private LocalDateTime pinnedAt;

    @Column(nullable = false, length = 10)
    private String visibility;

    @Column(name = "shared_at")
    private LocalDateTime sharedAt;

    @Column(name = "share_code", length = 32)
    private String shareCode;

    @Column(name = "reaction_count", nullable = false)
    private Integer reactionCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Record(
        User user,
        Path path,
        String categoryCode,
        LocalDate recordDate,
        String sceneText,
        String oneWordText,
        String tomorrowText,
        String moodCode,
        String imageUrl
    ) {
        this.user = user;
        this.path = path;
        this.categoryCode = categoryCode;
        this.recordDate = recordDate;
        this.sceneText = sceneText;
        this.oneWordText = oneWordText;
        this.tomorrowText = tomorrowText;
        this.moodCode = moodCode;
        this.imageUrl = imageUrl;
        this.isHidden = false;
        this.visibility = "PRIVATE";
        this.reactionCount = 0;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void share() {
        if ("PUBLIC".equals(this.visibility)) {
            throw new IllegalStateException("이미 공개된 기록입니다.");
        }
        this.visibility = "PUBLIC";
        this.sharedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void unshare() {
        if ("PRIVATE".equals(this.visibility)) {
            return;
        }
        this.visibility = "PRIVATE";
        this.sharedAt = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateContent(
        String sceneText,
        String oneWordText,
        String tomorrowText,
        String moodCode,
        String imageUrl
    ) {
        this.sceneText = sceneText;
        this.oneWordText = oneWordText;
        this.tomorrowText = tomorrowText;
        this.moodCode = moodCode;
        this.imageUrl = imageUrl;
        this.updatedAt = LocalDateTime.now();
    }

    public void softDelete() {
        this.isHidden = true;
        this.updatedAt = LocalDateTime.now();
    }

    public void hide() {
        softDelete();
    }

    public void pinMemory() {
        this.pinnedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void unpinMemory() {
        this.pinnedAt = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void increaseReactionCount() {
        this.reactionCount++;
        this.updatedAt = LocalDateTime.now();
    }

    public void decreaseReactionCount() {
        if (this.reactionCount > 0) {
            this.reactionCount--;
            this.updatedAt = LocalDateTime.now();
        }
    }
}
