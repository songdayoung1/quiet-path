# ERD (Quiet Path)

> 목적: Quiet Path 백엔드 구현을 위한 데이터 모델 기준 문서  
> DB: MySQL 8 / InnoDB  
> 기준 용어:
> - 사용자에게 보이는 핵심 개념은 `방향`
> - 물리 테이블명은 기존대로 `paths`를 유지할 수 있다
> - `paths` 테이블은 앱의 `방향(Direction)` 개념을 표현한다

---

## 0. 공통 정책

- User는 동시에 `ACTIVE` 방향을 최대 1개까지 가질 수 있으며, 없을 수도 있다
- Record는 하루에 1개만 작성할 수 있다
- `review_at`는 회고/AI 답장 열람 기준 시점이며 필수값이다
- `review_at`가 지나도 사용자는 계속 기록할 수 있다
- 방향 종료는 시스템 자동 종료가 아니라 사용자 직접 종료다
- 방향 종료 시 `completed_at`이 기록된다
- 지난 방향의 기록은 잠그지 않으며 모두 조회 가능하다
- 잠금 대상은 원본 Record가 아니라 `path_summaries`의 AI 회고 결과물이다
- AI 회고/미래의 답장은 `paths.review_at` 이후에만 열람할 수 있다
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

- purpose: 회원, 로그인 식별, 레벨/설정 저장
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
- rules:
  - 사용자당 현재 진행 중 방향은 최대 1개다
  - 현재 진행 중 방향은 `paths.status = ACTIVE` 조건으로 조회한다

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
  - `review_at` (datetime) not null
    - 의미: 회고/AI 답장 열람 기준 시점
  - `cover_record_id` (bigint) null
    - 의미: 홈/요약 화면에 노출할 대표 사진용 record id
  - `status` (varchar20) not null
    - 의미: 방향 상태
    - 값: `ACTIVE`, `COMPLETED`
  - `active_user_id` (bigint) generated null
    - 의미: `status = ACTIVE`일 때만 `user_id`를 노출하는 DB 제약 보조 컬럼
  - `completed_at` (datetime) null
    - 의미: 사용자가 방향을 종료한 시각
  - `created_at` (datetime) not null
    - 의미: 방향 생성 시각
  - `updated_at` (datetime) not null
    - 의미: 방향 수정 시각
- unique:
  - `(active_user_id)`
- index:
  - `(user_id, status, created_at)`
  - `(category_code, status, created_at)`
  - `(review_at)`
- fk:
  - `user_id -> users.id`
  - `cover_record_id -> records.id`
- rules:
  - 사용자당 동시에 `ACTIVE` 방향은 최대 1개까지 존재할 수 있다
  - 사용자가 기존 방향을 종료한 뒤 새 방향을 만들지 않으면 `ACTIVE` 방향이 0개인 휴지 상태가 될 수 있다
  - `review_at`는 알림 시점이자 AI 회고 노출 기준 시점이다
  - `review_at`가 지나도 `ACTIVE` 상태라면 계속 기록할 수 있다
  - 원본 Record는 항상 조회 가능하며, `review_at` 이전에는 AI 회고만 잠긴다
  - 사용자가 방향을 종료하면 `status = COMPLETED`, `completed_at = now`
  - `active_user_id`는 `status = ACTIVE`일 때만 `user_id` 값을 가지며, DB unique 제약으로 사용자당 ACTIVE 방향 1개를 보장한다
  - `cover_record_id`는 같은 path에 속한 record이면서 `image_url is not null`인 경우에만 설정할 수 있다

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
  - `is_hidden` (tinyint) not null default 0
    - 의미: 사용자만 보는 기록 숨김 여부
  - `pinned_at` (datetime) null
    - 의미: 기록 본문을 기억할 장면으로 고정한 시각
  - `visibility` (varchar10) not null default `PRIVATE`
    - 의미: 공개 여부
  - `shared_at` (datetime) null
    - 의미: 공개 전환 시각
  - `share_code` (varchar32) null
    - 의미: 외부 공유 링크용 공개 식별자
  - `reaction_count` (int) not null default 0
    - 의미: 공감 수 캐시
  - `created_at` (datetime) not null
    - 의미: 기록 생성 시각
  - `updated_at` (datetime) not null
    - 의미: 기록 수정 시각
- unique:
  - `(user_id, record_date)`
  - `(share_code)`
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
  - Record당 이미지는 기본적으로 1장만 허용한다
  - `pinned_at`이 있으면 해당 Record를 기억할 장면으로 간주한다
  - 대표 사진은 Record의 `pinned_at`으로 결정하지 않고 `paths.cover_record_id`로 관리한다
  - 공개 처리 시 `visibility = PUBLIC`, `shared_at = now`
  - 외부 링크 공유가 필요한 경우 `share_code`로 공개 URL을 구성한다

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

### comments

- purpose: 공개된 Record에 대한 댓글
- pk:
  - `id` (bigint)
- columns:
  - `record_id` (bigint) not null
    - 의미: 댓글 대상 record id
  - `user_id` (bigint) not null
    - 의미: 댓글 작성자 id
  - `content` (varchar500) not null
    - 의미: 댓글 본문
  - `deleted` (tinyint) not null default 0
    - 의미: 소프트 삭제 여부
  - `created_at` (datetime) not null
    - 의미: 댓글 생성 시각
  - `updated_at` (datetime) not null
    - 의미: 댓글 수정 시각
  - `deleted_at` (datetime) null
    - 의미: 댓글 삭제 시각
- index:
  - `(record_id, created_at)`
  - `(user_id, created_at)`
- fk:
  - `record_id -> records.id`
  - `user_id -> users.id`
- rules:
  - 공개된 Record에만 댓글을 작성할 수 있다
  - 현재 v1은 대댓글 없이 1단 댓글만 지원한다
  - 삭제는 물리 삭제 대신 소프트 삭제로 처리한다

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
  - `actor_user_id` (bigint) null
    - 의미: 이벤트 발생자 id, 시스템 알림이면 null
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
  - `actor_user_id is null`이면 시스템이 보낸 알림으로 간주한다
  - 화면에서는 `actor_user_id is null`인 알림을 `시스템` 발신으로 표시한다

---

### path_summaries

- purpose: 종료된 방향에 대한 AI 회고 결과 버전 이력
- pk:
  - `id` (bigint)
- columns:
  - `path_id` (bigint) not null
    - 의미: 요약 대상 방향 id
  - `version_no` (int) not null
    - 의미: 같은 방향에 대해 몇 번째로 생성된 요약 버전인지 나타내는 값
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
  - `(path_id, version_no)`
- index:
  - `(path_id, status, updated_at)`
- fk:
  - `path_id -> paths.id`
- rules:
  - `status`는 생성 상태만 의미하며 잠금 상태를 포함하지 않는다
  - 요약 노출 가능 여부는 `paths.review_at` 기준으로 계산한다
  - `paths.review_at` 이전에는 원본 Record는 조회 가능하지만 AI 회고는 조회할 수 없다
  - 방향이 `COMPLETED`로 전환되면 해당 방향은 AI 회고 생성 대상이 되며, 최초 row는 `version_no = 1`로 시작한다
  - 최초 row는 생성 시점에 `PENDING` 또는 `PROCESSING` 상태로 들어가고, 생성이 끝나면 `DONE`으로 전이된다
  - 사용자가 다시 요약하기를 실행하면 같은 `path_id`에 대해 `version_no`를 1 증가시킨 새 row를 생성한다
  - 화면에는 `review_at` 이후 가장 최신 버전의 완료된 요약을 노출한다
  - `prompt_version`은 어떤 프롬프트 템플릿으로 생성했는지 추적하기 위한 메타데이터로 유지한다
