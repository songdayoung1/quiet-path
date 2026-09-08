package kr.co.quietpath.domain.summary.entity;

import jakarta.persistence.*;
import kr.co.quietpath.domain.path.entity.Path;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

@Entity
@Table(name = "path_summaries",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_path_version", columnNames = {"path_id", "version_no"})
    },
    indexes = {
        @Index(name = "idx_path_status_updated", columnList = "path_id, status, updated_at")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PathSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "path_id", nullable = false)
    private Path path;

    @Column(name = "version_no", nullable = false)
    private Integer versionNo;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false, length = 20)
    private String format;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(length = 30)
    private String promptVersion;

    @Column(length = 50)
    private String model;

    @Column(length = 64)
    private String inputHash;

    @Column(nullable = false)
    @ColumnDefault("0")
    private int regenerationCount;

    private Boolean helpful;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public PathSummary(
        Path path,
        Integer versionNo,
        String promptVersion,
        String model,
        String inputHash
    ) {
        this.path = path;
        this.versionNo = versionNo != null ? versionNo : 1;
        this.status = "PENDING";
        this.format = "JSON";
        this.promptVersion = promptVersion;
        this.model = model;
        this.inputHash = inputHash;
        this.regenerationCount = 0;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void startProcessing() {
        this.status = "PROCESSING";
        this.updatedAt = LocalDateTime.now();
    }

    public void complete(String content) {
        this.status = "DONE";
        this.format = "JSON";
        this.content = content;
        this.updatedAt = LocalDateTime.now();
    }

    public void fail() {
        this.status = "FAILED";
        this.updatedAt = LocalDateTime.now();
    }

    public void updateContent(String content) {
        this.content = content;
        this.updatedAt = LocalDateTime.now();
    }

    public void retry(String promptVersion, String model, String inputHash) {
        this.status = "PENDING";
        this.format = "JSON";
        this.content = null;
        this.promptVersion = promptVersion;
        this.model = model;
        this.inputHash = inputHash;
        this.regenerationCount++;
        this.helpful = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateFeedback(boolean helpful) {
        this.helpful = helpful;
        this.updatedAt = LocalDateTime.now();
    }
}
