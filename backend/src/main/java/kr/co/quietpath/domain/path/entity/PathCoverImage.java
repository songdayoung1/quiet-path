package kr.co.quietpath.domain.path.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "path_cover_images",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_path_cover_images_path", columnNames = "path_id"),
        @UniqueConstraint(name = "uk_path_cover_images_storage_key", columnNames = "storage_key")
    }
)
@Comment("방향을 대표하는 대문 이미지와 화면 구도")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PathCoverImage {

    public static final BigDecimal DEFAULT_POSITION = new BigDecimal("50.00");
    public static final BigDecimal DEFAULT_SCALE = new BigDecimal("1.00");

    private static final BigDecimal MIN_POSITION = BigDecimal.ZERO;
    private static final BigDecimal MAX_POSITION = new BigDecimal("100.00");
    private static final BigDecimal MIN_SCALE = BigDecimal.ONE;
    private static final BigDecimal MAX_SCALE = new BigDecimal("3.00");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "path_id", nullable = false)
    private Path path;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "position_x", nullable = false, precision = 5, scale = 2)
    @ColumnDefault("50.00")
    private BigDecimal positionX;

    @Column(name = "position_y", nullable = false, precision = 5, scale = 2)
    @ColumnDefault("50.00")
    private BigDecimal positionY;

    @Column(name = "scale", nullable = false, precision = 4, scale = 2)
    @ColumnDefault("1.00")
    private BigDecimal scale;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public PathCoverImage(
        Path path,
        String storageKey,
        String imageUrl,
        BigDecimal positionX,
        BigDecimal positionY,
        BigDecimal scale
    ) {
        this.path = requirePath(path);
        replace(storageKey, imageUrl, positionX, positionY, scale);
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void replace(
        String storageKey,
        String imageUrl,
        BigDecimal positionX,
        BigDecimal positionY,
        BigDecimal scale
    ) {
        this.storageKey = requireText(storageKey, "storageKey");
        this.imageUrl = requireText(imageUrl, "imageUrl");
        applyDisplayPosition(positionX, positionY, scale);
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDisplayPosition(BigDecimal positionX, BigDecimal positionY, BigDecimal scale) {
        applyDisplayPosition(positionX, positionY, scale);
        this.updatedAt = LocalDateTime.now();
    }

    private void applyDisplayPosition(BigDecimal positionX, BigDecimal positionY, BigDecimal scale) {
        BigDecimal resolvedPositionX = positionX != null ? positionX : DEFAULT_POSITION;
        BigDecimal resolvedPositionY = positionY != null ? positionY : DEFAULT_POSITION;
        BigDecimal resolvedScale = scale != null ? scale : DEFAULT_SCALE;

        validateRange(resolvedPositionX, MIN_POSITION, MAX_POSITION, "positionX");
        validateRange(resolvedPositionY, MIN_POSITION, MAX_POSITION, "positionY");
        validateRange(resolvedScale, MIN_SCALE, MAX_SCALE, "scale");

        this.positionX = resolvedPositionX;
        this.positionY = resolvedPositionY;
        this.scale = resolvedScale;
    }

    private Path requirePath(Path value) {
        if (value == null) {
            throw new IllegalArgumentException("path는 필수입니다.");
        }
        return value;
    }

    private String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + "은 필수입니다.");
        }
        return value;
    }

    private void validateRange(BigDecimal value, BigDecimal min, BigDecimal max, String fieldName) {
        if (value.compareTo(min) < 0 || value.compareTo(max) > 0) {
            throw new IllegalArgumentException(fieldName + " 값이 허용 범위를 벗어났습니다.");
        }
    }
}
