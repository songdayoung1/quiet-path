# FEATURES (Quiet Path Backend)

본 문서는 Quiet Path의 백엔드 기능 목록 및 API 명세이다.

---

## 1. Path 기능

### 1.1 Path 생성
POST /api/paths

- 설명:
  - 사용자가 새로운 방향(Path)을 생성한다.
  - Path 생성 시 해당 Path는 ACTIVE 상태가 된다.

- 규칙:
  - 사용자당 ACTIVE Path는 1개만 가능하다.
  - 기존 ACTIVE Path가 존재하면 생성 요청은 거절한다.
  - category, keyQuestion, name, anchorAt은 필수다.

- DB:
  - insert paths
  - update users.current_path_id

- 트랜잭션:
  - 필요 (Path 생성 + User 업데이트)

---

### 1.2 Path 종료
POST /api/paths/{pathId}/close

- 설명:
  - ACTIVE Path를 종료 상태로 변경한다.

- 규칙:
  - ACTIVE 상태의 Path만 종료 가능하다.
  - 종료 시 closed_at을 기록한다.

- DB:
  - update paths.status = CLOSED
  - update users.current_path_id = null

---

## 2. Record 기능

### 2.1 오늘 기록 작성/수정 (Upsert)
POST /api/records/today

- 설명:
  - 오늘 날짜 기준 Record를 생성하거나 수정한다.

- 규칙:
  - 하루 1개 정책을 따른다.
  - 오늘 Record가 있으면 수정, 없으면 생성한다.
  - Record는 기본적으로 PRIVATE 상태다.

- DB:
  - select records by (user_id, record_date)
  - insert or update records

---

### 2.2 Record 공유
POST /api/records/{recordId}/share

- 설명:
  - 작성된 Record를 커뮤니티에 공유한다.

- 규칙:
  - 본인 Record만 공유 가능
  - 이미 PUBLIC이면 재공유 불가

- DB:
  - update records.visibility = PUBLIC
  - update records.shared_at = now

---

## 3. Reaction 기능

### 3.1 공감 추가
POST /api/records/{recordId}/reactions

- 설명:
  - PUBLIC Record에 공감을 추가한다.

- 규칙:
  - PUBLIC Record만 가능
  - 사용자당 Record 1회만 가능

- DB:
  - insert reactions
  - update records.reaction_count +1

---

### 3.2 공감 취소
DELETE /api/records/{recordId}/reactions

- DB:
  - delete reactions
  - update records.reaction_count -1

---

## 4. Title 기능

### 4.1 칭호 획득
POST /api/titles/{titleId}/acquire

- 설명:
  - 조건을 만족한 경우 칭호를 획득한다.

- 규칙:
  - 동일 칭호는 1회만 획득 가능

- DB:
  - insert user_titles

---

### 4.2 칭호 장착
POST /api/titles/{titleId}/equip

- 설명:
  - 보유한 칭호 중 하나를 장착한다.

- DB:
  - update users.current_title_id
