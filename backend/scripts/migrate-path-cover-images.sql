CREATE TABLE IF NOT EXISTS path_cover_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '방향 대문 이미지 식별자',
    path_id BIGINT NOT NULL COMMENT '대문 이미지가 속한 방향 식별자',
    storage_key VARCHAR(500) NOT NULL COMMENT '로컬 또는 S3 저장소 객체 키',
    image_url VARCHAR(1000) NOT NULL COMMENT '저장 시점의 이미지 URL',
    position_x DECIMAL(5, 2) NOT NULL DEFAULT 50.00 COMMENT '대문 프레임 가로 중심 위치 비율(0~100)',
    position_y DECIMAL(5, 2) NOT NULL DEFAULT 50.00 COMMENT '대문 프레임 세로 중심 위치 비율(0~100)',
    scale DECIMAL(4, 2) NOT NULL DEFAULT 1.00 COMMENT '대문 프레임 이미지 확대 비율(1~3)',
    created_at DATETIME NOT NULL COMMENT '대문 이미지 생성 시각',
    updated_at DATETIME NOT NULL COMMENT '대문 이미지 수정 시각',
    UNIQUE KEY uk_path_cover_images_path (path_id),
    UNIQUE KEY uk_path_cover_images_storage_key (storage_key),
    CONSTRAINT fk_path_cover_images_path FOREIGN KEY (path_id) REFERENCES paths(id),
    CONSTRAINT chk_path_cover_images_position_x CHECK (position_x BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_path_cover_images_position_y CHECK (position_y BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_path_cover_images_scale CHECK (scale BETWEEN 1.00 AND 3.00)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='방향을 대표하는 대문 이미지와 화면 구도';
