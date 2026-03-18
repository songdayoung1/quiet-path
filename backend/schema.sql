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
    current_path_id BIGINT,
    level INT NOT NULL DEFAULT 1,
    steps_taken INT NOT NULL DEFAULT 0,
    data_sync_enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    last_login_at DATETIME,
    UNIQUE KEY uk_provider_user (provider, provider_user_id),
    CONSTRAINT fk_users_current_title FOREIGN KEY (current_title_id) REFERENCES titles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paths (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_code VARCHAR(20) NOT NULL,
    key_question VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    start_at DATETIME NOT NULL,
    anchor_at DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL,
    closed_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_user_status_anchor (user_id, status, anchor_at),
    INDEX idx_category_status_anchor (category_code, status, anchor_at),
    CONSTRAINT fk_paths_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD CONSTRAINT fk_users_current_path FOREIGN KEY (current_path_id) REFERENCES paths(id);

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
    visibility VARCHAR(10) NOT NULL DEFAULT 'PRIVATE',
    shared_at DATETIME,
    reaction_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_user_date (user_id, record_date),
    INDEX idx_path_date (path_id, record_date),
    INDEX idx_visibility_category_shared (visibility, category_code, shared_at, id),
    CONSTRAINT fk_records_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_records_path FOREIGN KEY (path_id) REFERENCES paths(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    actor_user_id BIGINT NOT NULL,
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

CREATE TABLE path_summaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    path_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN',
    content MEDIUMTEXT,
    prompt_version VARCHAR(30),
    model VARCHAR(50),
    input_hash CHAR(64),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_path_prompt (path_id, prompt_version),
    INDEX idx_path_status_updated (path_id, status, updated_at),
    CONSTRAINT fk_path_summaries_path FOREIGN KEY (path_id) REFERENCES paths(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
