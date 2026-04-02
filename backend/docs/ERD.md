# ERD (Quiet Path)

> 목적: Quiet Path 백엔드 구현을 위한 데이터 모델 기준 문서  
> DB: MySQL 8 / InnoDB  
> 기준 용어:
> - 사용자에게 보이는 핵심 개념은 `방향`
> - 물리 테이블명은 기존대로 `paths`를 유지할 수 있다
> - `paths` 테이블은 앱의 `방향(Direction)` 개념을 표현한다

---

## 0. 공통 정책

- User는 동시에 하나의 진행 중 방향만 가진다
- Record는 하루에 1개만 작성할 수 있다
- `review_at`는 회고/알림 유도 시점이다
- `review_at`가 지나도 사용자는 계속 기록할 수 있다
- 방향 종료는 시스템 자동 종료가 아니라 사용자 직접 종료다
- 방향 종료 시 `completed_at`이 기록된다
- 지난 방향의 기록은 잠그지 않으며 모두 조회 가능하다
- Record의 감정은 `records.mood_code` enum 값으로 관리한다

---

## 1. enums (code list)

### provider
- `KAKAO`

설명:
- 로그인 제공자 구분 값

### category_code
- `JOB`
- `STUDY`
- `HEALTH`
- `HOBBY`
- `CERT`

설명:
- 방향의 주제 카테고리 코드
- 프론트 라벨과 분리된 백엔드 표준 코드다

### path_status
- `ACTIVE`
- `COMPLETED`

설명:
- `ACTIVE`: 현재 진행 중인 방향
- `COMPLETED`: 사용자가 종료한 방향

### visibility
- `PRIVATE`
- `PUBLIC`

설명:
- Record 공개 여부

### summary_status
- `PENDING`
- `PROCESSING`
- `DONE`
- `FAILED`

설명:
- 방향 요약 생성 상태
- 잠금 관련 상태는 사용하지 않는다

### mood_code
- `COZY`
- `BLANK`
- `SPARKLE`
- `CALM`
- `HOLDING`
- `EXCITED`

설명:
- `COZY`: 포근
- `BLANK`: 멍함
- `SPARKLE`: 반짝
- `CALM`: 잔잔
- `HOLDING`: 버팀
- `EXCITED`: 두근

---

## 2. tables

### users

- purpose: 회원, 로그인 식별, 현재 진행 중 방향 참조, 레벨/설정 저장
- pk:
  - `id` (bigint)
- columns:
  - `provider` (varchar20) not null
    - 의미: 로그인 제공자
    - 현재 정책: `KAKAO`
  - `provider_user_id` (varchar128) not null
    - 의미: 카카오 로그인에서 내려주는 사용자 고유 식별자
  - `email` (varchar255) null
    - 의미: 제공된 경우 저장하는 이메일
  - `nickname` (varchar30) not null
    - 의미: 앱 내 표시 닉네임
  - `current_title_id` (bigint) null
    - 의미: 현재 장착 중인 칭호
  - `current_path_id` (bigint) null
    - 의미: 현재 진행 중인 방향 id
  - `level` (int) not null default 1
    - 의미: 사용자 레벨
  - `steps_taken` (int) not null default 0
    - 의미: 누적 행동/진행량 카운트
  - `data_sync_enabled` (tinyint) not null default 1
    - 의미: 동기화 사용 여부
  - `created_at` (datetime) not null
    - 의미: 생성 시각
  - `updated_at` (datetime) not null
    - 의미: 수정 시각
  - `last_login_at` (datetime) null
    - 의미: 마지막 로그인 시각
- unique:
  - `(provider, provider_user_id)`
  - `(nickname)`
- index: (none)
- fk:
  - `current_title_id -> titles.id`
  - `current_path_id -> paths.id`
- rules:
  - 사용자당 현재 진행 중 방향은 최대 1개다
  - 진행 중 방향은 `users.current_path_id`로 참조한다

---

### titles

- purpose: 칭호 마스터 데이터
- pk:
  - `id` (bigint)
- columns:
  - `code` (varchar50) not null
    - 의미: 칭호 코드
  - `display_name` (varchar50) not null
    - 의미: 칭호 표시명
  - `description` (varchar255) null
    - 의미: 칭호 설명
  - `is_active` (tinyint) not null default 1
    - 의미: 활성 여부
  - `created_at` (datetime) not null
    - 의미: 생성 시각
- unique:
  - `(code)`
- index: (none)
- fk: (none)

---

### user_titles

- purpose: 유저가 획득한 칭호 이력
- pk:
  - `id` (bigint)
- columns:
  - `user_id` (bigint) not null
    - 의미: 칭호를 획득한 사용자 id
  - `title_id` (bigint) not null
    - 의미: 획득한 칭호 id
  - `acquired_at` (datetime) not null
    - 의미: 획득 시각
- unique:
  - `(user_id, title_id)`
- index:
  - `(user_id, acquired_at)`
- fk:
  - `user_id -> users.id`
  - `title_id -> titles.id`
- rules:
  - 같은 칭호는 사용자당 1회만 획득한다

---

### paths

- purpose: 사용자의 방향(Direction) 데이터
- pk:
  - `id` (bigint)
- columns:
  - `user_id` (bigint) not null
    - 의미: 방향 소유자 id
  - `category_code` (varchar20) not null
    - 의미: 방향 카테고리 코드
  - `direction_name` (varchar100) not null
    - 의미: 방향 제목
  - `direction_text` (varchar255) null
    - 의미: 사용자의 방향 내용
  - `review_at` (datetime) null
    - 의미: 회고/알림 유도 시점
  - `status` (varchar20) not null
    - 의미: 방향 상태
    - 값: `ACTIVE`, `COMPLETED`
  - `completed_at` (datetime) null
    - 의미: 사용자가 방향을 종료한 시각
  - `created_at` (datetime) not null
    - 의미: 방향 생성 시각
  - `updated_at` (datetime) not null
    - 의미: 방향 수정 시각
- unique: (none)
- index:
  - `(user_id, status, created_at)`
  - `(category_code, status, created_at)`
  - `(review_at)`
- fk:
  - `user_id -> users.id`
- rules:
  - 사용자당 동시에 `ACTIVE` 방향은 하나만 존재한다
  - `review_at`는 알림/회고 유도 시점이며 잠금 기준이 아니다
  - `review_at`가 지나도 `ACTIVE` 상태라면 계속 기록할 수 있다
  - 사용자가 방향을 종료하면 `status = COMPLETED`, `completed_at = now`

---

### records

- purpose: 하루 1개의 방향 기록
- pk:
  - `id` (bigint)
- columns:
  - `user_id` (bigint) not null
    - 의미: 기록 작성자 id
  - `path_id` (bigint) not null
    - 의미: 기록이 속한 방향 id
  - `category_code` (varchar20) not null
    - 의미: 방향에서 복사한 카테고리 코드
  - `record_date` (date) not null
    - 의미: 기록 날짜, KST 기준
  - `scene_text` (varchar500) null
    - 의미: 오늘의 장면
  - `one_word_text` (varchar200) null
    - 의미: 오늘을 한 단어로 표현한 값
  - `tomorrow_text` (varchar200) null
    - 의미: 내일의 한 걸음
  - `mood_code` (varchar30) null
    - 의미: 감정 상태 코드
  - `image_url` (varchar500) null
    - 의미: 기록 이미지 URL 또는 저장 참조값
  - `visibility` (varchar10) not null default `PRIVATE`
    - 의미: 공개 여부
  - `shared_at` (datetime) null
    - 의미: 공개 전환 시각
  - `reaction_count` (int) not null default 0
    - 의미: 공감 수 캐시
  - `created_at` (datetime) not null
    - 의미: 기록 생성 시각
  - `updated_at` (datetime) not null
    - 의미: 기록 수정 시각
- unique:
  - `(user_id, record_date)`
- index:
  - `(path_id, record_date)`
  - `(visibility, category_code, shared_at, id)`
  - `(mood_code, record_date)`
- fk:
  - `user_id -> users.id`
  - `path_id -> paths.id`
- rules:
  - 사용자당 하루 1개만 작성 가능하다
  - 같은 날짜 재요청은 생성이 아니라 에러로 처리한다
  - 공개 처리 시 `visibility = PUBLIC`, `shared_at = now`

---

### reactions

- purpose: 공개된 Record에 대한 공감
- pk:
  - `id` (bigint)
- columns:
  - `record_id` (bigint) not null
    - 의미: 공감 대상 record id
  - `user_id` (bigint) not null
    - 의미: 공감한 사용자 id
  - `created_at` (datetime) not null
    - 의미: 공감 생성 시각
- unique:
  - `(user_id, record_id)`
- index:
  - `(record_id, created_at)`
- fk:
  - `record_id -> records.id`
  - `user_id -> users.id`
- rules:
  - 공개된 Record에만 공감할 수 있다

---

### notifications

- purpose: 인앱 알림 데이터
- pk:
  - `id` (bigint)
- columns:
  - `recipient_user_id` (bigint) not null
    - 의미: 알림 수신자 id
  - `type` (varchar30) not null
    - 의미: 알림 타입
  - `actor_user_id` (bigint) not null
    - 의미: 이벤트 발생자 id
  - `target_type` (varchar20) not null
    - 의미: 알림 대상 타입
  - `target_id` (bigint) not null
    - 의미: 알림 대상 id
  - `message` (varchar500) not null
    - 의미: 사용자에게 보여줄 알림 메시지
  - `is_read` (tinyint) not null default 0
    - 의미: 읽음 여부
  - `created_at` (datetime) not null
    - 의미: 알림 생성 시각
  - `read_at` (datetime) null
    - 의미: 읽음 처리 시각
- index:
  - `(recipient_user_id, created_at)`
  - `(recipient_user_id, is_read, created_at)`
- fk:
  - `recipient_user_id -> users.id`
  - `actor_user_id -> users.id`
- rules:
  - 수신자 본인만 조회/읽음 처리 가능하다

---

### path_summaries

- purpose: 종료된 방향에 대한 AI 요약 결과
- pk:
  - `id` (bigint)
- columns:
  - `path_id` (bigint) not null
    - 의미: 요약 대상 방향 id
  - `status` (varchar20) not null
    - 의미: 요약 생성 상태
  - `format` (varchar20) not null default `MARKDOWN`
    - 의미: 요약 포맷
  - `content` (mediumtext) null
    - 의미: 요약 본문
  - `prompt_version` (varchar30) null
    - 의미: 프롬프트 버전
  - `model` (varchar50) null
    - 의미: 생성 모델명
  - `input_hash` (char64) null
    - 의미: 입력 데이터 해시
  - `created_at` (datetime) not null
    - 의미: 생성 시각
  - `updated_at` (datetime) not null
    - 의미: 수정 시각
- unique:
  - `(path_id, prompt_version)`
- index:
  - `(path_id, status, updated_at)`
- fk:
  - `path_id -> paths.id`
- rules:
  - 잠금 상태는 사용하지 않는다
  - 요약이 있으면 그대로 조회 가능하다
  - 필요 시 `prompt_version` 기준으로 재생성할 수 있다
