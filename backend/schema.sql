CREATE TABLE titles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    nickname VARCHAR(30) NOT NULL UNIQUE,
    current_title_id BIGINT,
    level INT NOT NULL DEFAULT 1,
    steps_taken INT NOT NULL DEFAULT 0,
    data_sync_enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    last_login_at DATETIME,
    UNIQUE KEY uk_provider_user (provider, provider_user_id),
    CONSTRAINT fk_users_current_title FOREIGN KEY (current_title_id) REFERENCES titles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_refresh_token_hash (token_hash),
    UNIQUE KEY uk_refresh_user_session (user_id, session_id),
    INDEX idx_refresh_user_expires (user_id, expires_at),
    INDEX idx_refresh_expires (expires_at),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paths (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_code VARCHAR(20) NOT NULL,
    direction_name VARCHAR(100) NOT NULL,
    direction_text VARCHAR(255),
    review_at DATETIME NOT NULL,
    cover_record_id BIGINT,
    status VARCHAR(20) NOT NULL,
    active_user_id BIGINT GENERATED ALWAYS AS (
        CASE
            WHEN status = 'ACTIVE' THEN user_id
            ELSE NULL
        END
    ) STORED,
    completed_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_paths_active_user (active_user_id),
    INDEX idx_user_status_created (user_id, status, created_at),
    INDEX idx_category_status_created (category_code, status, created_at),
    INDEX idx_review_at (review_at),
    CONSTRAINT fk_paths_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_titles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title_id BIGINT NOT NULL,
    acquired_at DATETIME NOT NULL,
    UNIQUE KEY uk_user_title (user_id, title_id),
    INDEX idx_user_acquired (user_id, acquired_at),
    CONSTRAINT fk_user_titles_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_titles_title FOREIGN KEY (title_id) REFERENCES titles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE record_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '기록 이미지 식별자',
    storage_key VARCHAR(500) NULL COMMENT '로컬 또는 S3 저장소 객체 키, 기존 URL 이관 데이터는 NULL 가능',
    image_url VARCHAR(1000) NOT NULL COMMENT '화면에서 이미지를 조회할 수 있는 URL',
    position_x DECIMAL(5, 2) NOT NULL DEFAULT 50.00 COMMENT '4:3 프레임에 표시할 이미지 가로 중심 위치 비율(0~100)',
    position_y DECIMAL(5, 2) NOT NULL DEFAULT 50.00 COMMENT '4:3 프레임에 표시할 이미지 세로 중심 위치 비율(0~100)',
    scale DECIMAL(4, 2) NOT NULL DEFAULT 1.00 COMMENT '프레임을 채우는 최소 배율 기준 이미지 확대 비율(1~3)',
    created_at DATETIME NOT NULL COMMENT '이미지 정보 생성 시각',
    updated_at DATETIME NOT NULL COMMENT '이미지 정보 마지막 수정 시각',
    UNIQUE KEY uk_record_images_storage_key (storage_key),
    CONSTRAINT chk_record_images_position_x CHECK (position_x BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_record_images_position_y CHECK (position_y BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_record_images_scale CHECK (scale BETWEEN 1.00 AND 3.00)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='기록에 연결되는 단건 이미지와 화면 구도';

CREATE TABLE records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    path_id BIGINT NOT NULL,
    category_code VARCHAR(20) NOT NULL,
    record_date DATE NOT NULL,
    scene_text VARCHAR(500),
    one_word_text VARCHAR(200),
    tomorrow_text VARCHAR(200),
    mood_code VARCHAR(30),
    image_id BIGINT COMMENT '기록에 연결된 단건 이미지 식별자',
    is_hidden TINYINT NOT NULL DEFAULT 0,
    pinned_at DATETIME,
    visibility VARCHAR(10) NOT NULL DEFAULT 'PRIVATE',
    shared_at DATETIME,
    share_code VARCHAR(32),
    reaction_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_path_date (path_id, record_date),
    UNIQUE KEY uk_records_share_code (share_code),
    UNIQUE KEY uk_records_image (image_id),
    INDEX idx_user_record_date_id (user_id, record_date, id),
    INDEX idx_path_date (path_id, record_date),
    INDEX idx_visibility_category_shared (visibility, category_code, shared_at, id),
    INDEX idx_mood_date (mood_code, record_date),
    CONSTRAINT fk_records_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_records_path FOREIGN KEY (path_id) REFERENCES paths(id),
    CONSTRAINT fk_records_image FOREIGN KEY (image_id) REFERENCES record_images(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE paths ADD CONSTRAINT fk_paths_cover_record FOREIGN KEY (cover_record_id) REFERENCES records(id);

CREATE TABLE reactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    record_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_user_record (user_id, record_id),
    INDEX idx_record_created (record_id, created_at),
    CONSTRAINT fk_reactions_record FOREIGN KEY (record_id) REFERENCES records(id),
    CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    record_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(500) NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    deleted_at DATETIME,
    INDEX idx_comments_record_created (record_id, created_at),
    INDEX idx_comments_user_created (user_id, created_at),
    CONSTRAINT fk_comments_record FOREIGN KEY (record_id) REFERENCES records(id),
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    actor_user_id BIGINT,
    target_type VARCHAR(20) NOT NULL,
    target_id BIGINT NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    read_at DATETIME,
    INDEX idx_notification_recipient_created (recipient_user_id, created_at),
    INDEX idx_notification_recipient_read_created (recipient_user_id, is_read, created_at),
    CONSTRAINT fk_notifications_recipient_user FOREIGN KEY (recipient_user_id) REFERENCES users(id),
    CONSTRAINT fk_notifications_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_preferences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    reaction_enabled TINYINT NOT NULL DEFAULT 1,
    comment_enabled TINYINT NOT NULL DEFAULT 1,
    review_reminder_enabled TINYINT NOT NULL DEFAULT 0,
    review_reminder_time TIME NOT NULL DEFAULT '21:00:00',
    time_zone VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_notification_preferences_user (user_id),
    INDEX idx_notification_preferences_review_due (
        review_reminder_enabled,
        time_zone,
        review_reminder_time,
        user_id
    ),
    CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE web_push_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    endpoint VARCHAR(2048) NOT NULL,
    endpoint_hash CHAR(64) NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    user_agent VARCHAR(500),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_web_push_subscriptions_endpoint_hash (endpoint_hash),
    INDEX idx_web_push_subscriptions_user (user_id),
    CONSTRAINT fk_web_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    scheduled_date DATE NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_notification_deliveries_event (user_id, type, target_id, scheduled_date),
    CONSTRAINT fk_notification_deliveries_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE path_summaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    path_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    format VARCHAR(20) NOT NULL DEFAULT 'JSON',
    content MEDIUMTEXT,
    prompt_version VARCHAR(30),
    model VARCHAR(50),
    input_hash CHAR(64),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_path_version (path_id, version_no),
    INDEX idx_path_status_updated (path_id, status, updated_at),
    CONSTRAINT fk_path_summaries_path FOREIGN KEY (path_id) REFERENCES paths(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
