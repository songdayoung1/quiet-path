# Quiet Path - Database ERD

> Spring Boot 4.0.2 / JPA (Hibernate) / MySQL 8 (InnoDB, utf8mb4)
>
> 최종 갱신: 2026-03-10

---

## 1. ERD 다이어그램

```
┌─────────────────────┐
│       titles        │
├─────────────────────┤
│ PK  id              │
│     code (UQ)       │
│     display_name    │
│     description     │
│     is_active       │
│     created_at      │
└────────┬────────────┘
         │
         │ 1
         │
         ├──────────────────────────────┐
         │ n                            │
┌────────┴────────────┐      ┌─────────┴───────────┐
│    user_titles      │      │       users          │
├─────────────────────┤      ├──────────────────────┤
│ PK  id              │      │ PK  id               │
│ FK  user_id  ───────┼──n──▶│     provider         │
│ FK  title_id ───────┼──1──▶│     provider_user_id │
│     acquired_at     │      │     email            │
│                     │      │     nickname (UQ)    │
│ UQ (user, title)    │      │ FK  current_title_id │◀── titles
└─────────────────────┘      │ FK  current_path_id  │◀── paths
                             │     level            │
                             │     steps_taken      │
                             │     data_sync_enabled│
                             │     created_at       │
                             │     updated_at       │
                             │     last_login_at    │
                             │                      │
                             │ UQ (provider,        │
                             │     provider_user_id)│
                             └──────────┬───────────┘
                                        │ 1
                          ┌─────────────┼─────────────────┐
                          │ n           │ n               │ n
                  ┌───────┴──────┐  ┌──┴──────────┐  ┌───┴──────────────┐
                  │    paths     │  │   records    │  │   reactions      │
                  ├──────────────┤  ├─────────────-┤  ├──────────────────┤
                  │ PK id        │  │ PK id        │  │ PK id            │
                  │ FK user_id   │  │ FK user_id   │  │ FK record_id     │
                  │ category_code│  │ FK path_id   │  │ FK user_id       │
                  │ key_question │  │ category_code│  │    created_at    │
                  │ name         │  │ record_date  │  │                  │
                  │ description  │  │ scene_text   │  │ UQ (user, record)│
                  │ start_at     │  │ one_word_text│  └──────────────────┘
                  │ anchor_at    │  │ tomorrow_text│
                  │ status       │  │ mood_code    │
                  │ closed_at    │  │ visibility   │
                  │ created_at   │  │ shared_at    │
                  │ updated_at   │  │ reaction_cnt │
                  └──────┬───────┘  │ created_at   │
                         │ 1        │ updated_at   │
                         │          │              │
                         │          │ UQ (user,    │
                         │          │     date)    │
                         │          └──────┬───────┘
                         │                 │ (target)
                  ┌──────┴───────┐  ┌──────┴───────────┐
                  │path_summaries│  │    comments       │
                  ├──────────────┤  ├──────────────────-┤
                  │ PK id        │  │ PK id             │
                  │ FK path_id   │  │    target_type    │
                  │    status    │  │    target_id      │
                  │    format    │  │    user_id        │
                  │    content   │  │    content        │
                  │ prompt_ver.  │  │    deleted        │
                  │    model     │  │    created_at     │
                  │ input_hash   │  │    updated_at     │
                  │ created_at   │  │    deleted_at     │
                  │ updated_at   │  └──────────────────-┘
                  │              │
                  │ UQ (path,    │  ┌───────────────────┐
                  │  prompt_ver.)│  │   notifications   │
                  └──────────────┘  ├───────────────────┤
                                    │ PK id             │
                                    │    recipient_id   │
                                    │    type           │
                                    │    actor_user_id  │
                                    │    target_type    │
                                    │    target_id      │
                                    │    message        │
                                    │    read           │
                                    │    created_at     │
                                    │    read_at        │
                                    └───────────────────┘
```

---

## 2. 테이블 상세 명세

### 2.1 users

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 사용자 식별자 |
| `provider` | VARCHAR(20) | NOT NULL | OAuth 제공자 (GOOGLE) |
| `provider_user_id` | VARCHAR(128) | NOT NULL | OAuth 제공자 사용자 ID |
| `email` | VARCHAR(255) | NULLABLE | 이메일 |
| `nickname` | VARCHAR(30) | NOT NULL, UNIQUE | 닉네임 |
| `current_title_id` | BIGINT | FK → titles.id, NULLABLE | 현재 장착 칭호 |
| `current_path_id` | BIGINT | FK → paths.id, NULLABLE | 현재 활성 경로 |
| `level` | INT | NOT NULL, DEFAULT 1 | 레벨 |
| `steps_taken` | INT | NOT NULL, DEFAULT 0 | 총 걸음 수 |
| `data_sync_enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE | 데이터 동기화 여부 |
| `created_at` | DATETIME | NOT NULL | 생성일시 |
| `updated_at` | DATETIME | NOT NULL | 수정일시 |
| `last_login_at` | DATETIME | NULLABLE | 최근 로그인일시 |

**유니크 제약**: `uk_provider_user` (provider, provider_user_id)

---

### 2.2 paths

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 경로 식별자 |
| `user_id` | BIGINT | FK → users.id, NOT NULL | 소유 사용자 |
| `category_code` | VARCHAR(20) | NOT NULL | 카테고리 코드 |
| `key_question` | VARCHAR(255) | NOT NULL | 핵심 질문 |
| `name` | VARCHAR(100) | NOT NULL | 경로 이름 |
| `description` | VARCHAR(500) | NULLABLE | 설명 |
| `start_at` | DATETIME | NOT NULL | 시작일시 |
| `anchor_at` | DATETIME | NOT NULL | 목표 날짜 |
| `status` | VARCHAR(20) | NOT NULL | 상태 (ACTIVE / FINISHED) |
| `closed_at` | DATETIME | NULLABLE | 종료일시 |
| `created_at` | DATETIME | NOT NULL | 생성일시 |
| `updated_at` | DATETIME | NOT NULL | 수정일시 |

**인덱스**:
- `idx_user_status_anchor` (user_id, status, anchor_at)
- `idx_category_status_anchor` (category_code, status, anchor_at)

**카테고리 코드 값**: `JOB` | `STUDY` | `HEALTH` | `HOBBY` | `CERT`

---

### 2.3 records

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 기록 식별자 |
| `user_id` | BIGINT | FK → users.id, NOT NULL | 작성 사용자 |
| `path_id` | BIGINT | FK → paths.id, NOT NULL | 소속 경로 |
| `category_code` | VARCHAR(20) | NOT NULL | 카테고리 코드 |
| `record_date` | DATE | NOT NULL | 기록 날짜 (KST) |
| `scene_text` | VARCHAR(500) | NULLABLE | 오늘의 장면 |
| `one_word_text` | VARCHAR(200) | NULLABLE | 한 줄 요약 |
| `tomorrow_text` | VARCHAR(200) | NULLABLE | 내일의 다짐 |
| `mood_code` | VARCHAR(30) | NULLABLE | 감정 코드 |
| `visibility` | VARCHAR(10) | NOT NULL, DEFAULT 'PRIVATE' | 공개 여부 |
| `shared_at` | DATETIME | NULLABLE | 공개 전환일시 |
| `reaction_count` | INT | NOT NULL, DEFAULT 0 | 공감 수 (비정규화) |
| `created_at` | DATETIME | NOT NULL | 생성일시 |
| `updated_at` | DATETIME | NOT NULL | 수정일시 |

**유니크 제약**: `uk_user_date` (user_id, record_date) — 하루 한 건 제약

**인덱스**:
- `idx_path_date` (path_id, record_date)
- `idx_visibility_category_shared` (visibility, category_code, shared_at, id)

---

### 2.4 reactions

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 공감 식별자 |
| `record_id` | BIGINT | FK → records.id, NOT NULL | 대상 기록 |
| `user_id` | BIGINT | FK → users.id, NOT NULL | 공감한 사용자 |
| `created_at` | DATETIME | NOT NULL | 생성일시 |

**유니크 제약**: `uk_user_record` (user_id, record_id) — 사용자당 기록 1회 공감

**인덱스**: `idx_record_created` (record_id, created_at)

---

### 2.5 comments

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 댓글 식별자 |
| `target_type` | VARCHAR(20) | NOT NULL | 대상 엔티티 타입 (RECORD) |
| `target_id` | BIGINT | NOT NULL | 대상 엔티티 ID |
| `user_id` | BIGINT | NOT NULL | 작성 사용자 |
| `content` | VARCHAR(500) | NOT NULL | 댓글 내용 |
| `deleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | 소프트 삭제 여부 |
| `created_at` | DATETIME | NOT NULL | 생성일시 |
| `updated_at` | DATETIME | NOT NULL | 수정일시 |
| `deleted_at` | DATETIME | NULLABLE | 삭제일시 |

**인덱스**: `idx_comment_target_created` (target_type, target_id, created_at)

> **참고**: 다형성 연관(Polymorphic Association) 패턴 사용 — `target_type` + `target_id` 조합으로 대상을 참조

---

### 2.6 titles

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 칭호 식별자 |
| `code` | VARCHAR(50) | NOT NULL, UNIQUE | 칭호 코드 |
| `display_name` | VARCHAR(50) | NOT NULL | 표시 이름 |
| `description` | VARCHAR(255) | NULLABLE | 설명 |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | 활성 여부 |
| `created_at` | DATETIME | NOT NULL | 생성일시 |

---

### 2.7 user_titles

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 식별자 |
| `user_id` | BIGINT | FK → users.id, NOT NULL | 사용자 |
| `title_id` | BIGINT | FK → titles.id, NOT NULL | 칭호 |
| `acquired_at` | DATETIME | NOT NULL | 획득일시 |

**유니크 제약**: `uk_user_title` (user_id, title_id) — 칭호 중복 획득 방지

**인덱스**: `idx_user_acquired` (user_id, acquired_at)

---

### 2.8 path_summaries

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 요약 식별자 |
| `path_id` | BIGINT | FK → paths.id, NOT NULL | 대상 경로 |
| `status` | VARCHAR(20) | NOT NULL | 상태 |
| `format` | VARCHAR(20) | NOT NULL, DEFAULT 'MARKDOWN' | 형식 |
| `content` | MEDIUMTEXT | NULLABLE | AI 생성 요약 본문 |
| `prompt_version` | VARCHAR(30) | NULLABLE | 프롬프트 버전 |
| `model` | VARCHAR(50) | NULLABLE | AI 모델명 |
| `input_hash` | CHAR(64) | NULLABLE | 입력 해시(캐싱 용도) |
| `created_at` | DATETIME | NOT NULL | 생성일시 |
| `updated_at` | DATETIME | NOT NULL | 수정일시 |

**유니크 제약**: `uk_path_prompt` (path_id, prompt_version)

**인덱스**: `idx_path_status_updated` (path_id, status, updated_at)

**상태 값**: `PENDING` → `PROCESSING` → `DONE` | `FAILED`

---

### 2.9 notifications

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 알림 식별자 |
| `recipient_user_id` | BIGINT | NOT NULL | 수신 사용자 |
| `type` | VARCHAR(30) | NOT NULL | 알림 유형 |
| `actor_user_id` | BIGINT | NOT NULL | 행위 사용자 |
| `target_type` | VARCHAR(20) | NOT NULL | 대상 엔티티 타입 |
| `target_id` | BIGINT | NOT NULL | 대상 엔티티 ID |
| `message` | VARCHAR(500) | NOT NULL | 알림 메시지 |
| `read` | BOOLEAN | NOT NULL, DEFAULT FALSE | 읽음 여부 |
| `created_at` | DATETIME | NOT NULL | 생성일시 |
| `read_at` | DATETIME | NULLABLE | 읽은 일시 |

**인덱스**: `idx_notification_recipient_created` (recipient_user_id, created_at)

> **참고**: comments, notifications 테이블은 엔티티는 존재하나 schema.sql 미반영 상태 (구현 대기)

---

## 3. 관계 요약

| 관계 | 타입 | 설명 |
|------|------|------|
| users → paths | 1:N | 사용자는 여러 경로를 가짐 |
| users → records | 1:N | 사용자는 여러 기록을 작성 |
| users → reactions | 1:N | 사용자는 여러 공감을 남김 |
| users → user_titles | 1:N | 사용자는 여러 칭호를 획득 |
| users ↔ titles | N:1 | 사용자는 현재 칭호 하나를 장착 |
| users ↔ paths | N:1 | 사용자는 현재 활성 경로 하나를 가짐 |
| paths → records | 1:N | 경로에 여러 기록이 속함 |
| paths → path_summaries | 1:N | 경로에 여러 AI 요약이 생성됨 |
| records → reactions | 1:N | 기록에 여러 공감이 달림 |
| records ← comments | 1:N | 기록에 여러 댓글이 달림 (다형성) |
| titles → user_titles | 1:N | 칭호는 여러 사용자에게 부여됨 |

모든 연관관계는 **LAZY 페치** 전략을 사용하며, **Cascade 없음** (서비스 레이어에서 수동 관리).

---

## 4. Enum / 코드 값 정리

### ProviderType (Java Enum)
| 값 | 설명 |
|----|------|
| `GOOGLE` | Google OAuth |

### Category Code (String)
| 값 | 설명 |
|----|------|
| `JOB` | 취업/직무 |
| `STUDY` | 학습 |
| `HEALTH` | 건강 |
| `HOBBY` | 취미 |
| `CERT` | 자격증 |

### Path Status (String)
| 값 | 설명 |
|----|------|
| `ACTIVE` | 진행 중 |
| `FINISHED` | 완료 |

### Record Visibility (String)
| 값 | 설명 |
|----|------|
| `PRIVATE` | 비공개 (기본값) |
| `PUBLIC` | 공개 |

### PathSummary Status (String)
| 값 | 설명 |
|----|------|
| `PENDING` | 대기 |
| `PROCESSING` | 처리 중 |
| `DONE` | 완료 |
| `FAILED` | 실패 |

### DurationType (Java Enum — API DTO)
| 값 | 설명 |
|----|------|
| `DAYS_7` | 7일 |
| `DAYS_30` | 30일 |
| `DAYS_90` | 90일 |
| `CUSTOM` | 사용자 지정 |

---

## 5. 설계 특징

| 항목 | 설명 |
|------|------|
| **소프트 삭제** | `comments` 테이블에 `deleted` + `deleted_at` 패턴 적용 |
| **비정규화** | `records.reaction_count`로 공감 수 캐싱 |
| **다형성 연관** | `comments`, `notifications`에서 `target_type` + `target_id` 조합으로 유연한 대상 참조 |
| **하루 한 건 제약** | `records` 테이블 `uk_user_date`로 사용자당 하루 1개 기록만 허용 |
| **AI 요약 캐싱** | `path_summaries.input_hash`(SHA-256)로 입력 변경 감지 및 중복 생성 방지 |
| **문자셋** | MySQL utf8mb4 — 이모지 등 전체 유니코드 지원 |
| **엔진** | InnoDB — 트랜잭션 및 외래키 제약 지원 |
