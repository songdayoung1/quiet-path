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
        @UniqueConstraint(name = "uk_user_date", columnNames = {"user_id", "record_date"})
    },
    indexes = {
        @Index(name = "idx_path_date", columnList = "path_id, record_date"),
        @Index(name = "idx_visibility_category_shared", columnList = "visibility, category_code, shared_at, id")
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

    @Column(nullable = false, length = 20)
    private String categoryCode;

    @Column(nullable = false)
    private LocalDate recordDate;

    @Column(length = 500)
    private String sceneText;

    @Column(length = 200)
    private String oneWordText;

    @Column(length = 200)
    private String tomorrowText;

    @Column(length = 30)
    private String moodCode;

    @Column(nullable = false, length = 10)
    private String visibility;

    @Column
    private LocalDateTime sharedAt;

    @Column(nullable = false)
    private Integer reactionCount;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
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
        String moodCode
    ) {
        this.user = user;
        this.path = path;
        this.categoryCode = categoryCode;
        this.recordDate = recordDate;
        this.sceneText = sceneText;
        this.oneWordText = oneWordText;
        this.tomorrowText = tomorrowText;
        this.moodCode = moodCode;
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

    public void updateContent(
        String sceneText,
        String oneWordText,
        String tomorrowText,
        String moodCode
    ) {
        this.sceneText = sceneText;
        this.oneWordText = oneWordText;
        this.tomorrowText = tomorrowText;
        this.moodCode = moodCode;
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
