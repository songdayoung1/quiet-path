-- 기존 records.image_url을 record_images 일대일 구조로 이관한다.
-- 연결 검증이 끝나면 records.image_url 레거시 컬럼을 제거한다.

CREATE TABLE record_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '기록 이미지 식별자',
    storage_key VARCHAR(500) NULL COMMENT '로컬 또는 S3 저장소 객체 키, 기존 URL 이관 데이터는 NULL 가능',
    image_url VARCHAR(1000) NOT NULL COMMENT '화면에서 이미지를 조회할 수 있는 URL',
    position_x DECIMAL(5, 2) NOT NULL DEFAULT 50.00 COMMENT '4:3 프레임에 표시할 이미지 가로 중심 위치 비율(0~100)',
    position_y DECIMAL(5, 2) NOT NULL DEFAULT 50.00 COMMENT '4:3 프레임에 표시할 이미지 세로 중심 위치 비율(0~100)',
    scale DECIMAL(4, 2) NOT NULL DEFAULT 1.00 COMMENT '프레임을 채우는 최소 배율 기준 이미지 확대 비율(1~3)',
    created_at DATETIME(6) NOT NULL COMMENT '이미지 정보 생성 시각',
    updated_at DATETIME(6) NOT NULL COMMENT '이미지 정보 마지막 수정 시각',
    UNIQUE KEY uk_record_images_storage_key (storage_key),
    CONSTRAINT chk_record_images_position_x CHECK (position_x BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_record_images_position_y CHECK (position_y BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_record_images_scale CHECK (scale BETWEEN 1.00 AND 3.00)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='기록에 연결되는 단건 이미지와 화면 구도';

ALTER TABLE records
    ADD COLUMN image_id BIGINT NULL COMMENT '기록에 연결된 단건 이미지 식별자' AFTER image_url,
    ADD UNIQUE KEY uk_records_image (image_id),
    ADD CONSTRAINT fk_records_image FOREIGN KEY (image_id) REFERENCES record_images(id);

INSERT INTO record_images (
    storage_key,
    image_url,
    position_x,
    position_y,
    scale,
    created_at,
    updated_at
)
SELECT
    CONCAT('migration/record/', id),
    image_url,
    50.00,
    50.00,
    1.00,
    created_at,
    updated_at
FROM records
WHERE image_url IS NOT NULL
  AND image_url <> '';

UPDATE records AS record
JOIN record_images AS image
  ON image.storage_key = CONCAT('migration/record/', record.id)
SET record.image_id = image.id
WHERE record.image_url IS NOT NULL
  AND record.image_url <> ''
  AND record.image_id IS NULL;

UPDATE record_images
SET storage_key = NULL
WHERE storage_key LIKE 'migration/record/%';

ALTER TABLE records
    DROP COLUMN image_url;
