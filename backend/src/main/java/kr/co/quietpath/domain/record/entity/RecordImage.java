package kr.co.quietpath.domain.record.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "record_images",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_record_images_storage_key",
        columnNames = "storage_key"
    )
)
@Comment("기록에 연결되는 단건 이미지와 화면 구도")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecordImage {

    public static final BigDecimal DEFAULT_POSITION = new BigDecimal("50.00");
    public static final BigDecimal DEFAULT_SCALE = new BigDecimal("1.00");

    private static final BigDecimal MIN_POSITION = BigDecimal.ZERO;
    private static final BigDecimal MAX_POSITION = new BigDecimal("100.00");
    private static final BigDecimal MIN_SCALE = BigDecimal.ONE;
    private static final BigDecimal MAX_SCALE = new BigDecimal("3.00");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("기록 이미지 식별자")
    private Long id;

    @Column(name = "storage_key", length = 500)
    @Comment("로컬 또는 S3 저장소 객체 키, 기존 URL 이관 데이터는 NULL 가능")
    private String storageKey;

    @Column(name = "image_url", nullable = false, length = 1000)
    @Comment("화면에서 이미지를 조회할 수 있는 URL")
    private String imageUrl;

    @Column(name = "position_x", nullable = false, precision = 5, scale = 2)
    @ColumnDefault("50.00")
    @Comment("4:3 프레임에 표시할 이미지 가로 중심 위치 비율(0~100)")
    private BigDecimal positionX;

    @Column(name = "position_y", nullable = false, precision = 5, scale = 2)
    @ColumnDefault("50.00")
    @Comment("4:3 프레임에 표시할 이미지 세로 중심 위치 비율(0~100)")
    private BigDecimal positionY;

    @Column(name = "scale", nullable = false, precision = 4, scale = 2)
    @ColumnDefault("1.00")
    @Comment("프레임을 채우는 최소 배율 기준 이미지 확대 비율(1~3)")
    private BigDecimal scale;

    @Column(name = "created_at", nullable = false)
    @Comment("이미지 정보 생성 시각")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @Comment("이미지 정보 마지막 수정 시각")
    private LocalDateTime updatedAt;

    @Builder
    public RecordImage(
        String storageKey,
        String imageUrl,
        BigDecimal positionX,
        BigDecimal positionY,
        BigDecimal scale
    ) {
        this.storageKey = storageKey;
        this.imageUrl = requireImageUrl(imageUrl);
        applyDisplayPosition(positionX, positionY, scale);
        this.createdAt = LocalDateTime.now();
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

    private String requireImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("imageUrl은 필수입니다.");
        }
        return imageUrl;
    }

    private void validateRange(BigDecimal value, BigDecimal min, BigDecimal max, String fieldName) {
        if (value.compareTo(min) < 0 || value.compareTo(max) > 0) {
            throw new IllegalArgumentException(fieldName + " 값이 허용 범위를 벗어났습니다.");
        }
    }
}
