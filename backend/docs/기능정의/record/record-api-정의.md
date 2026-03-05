# Record (오늘의 기록)

## 1. 개요

Record는 사용자가 **하루에 한 번** 자신의 Path(방향)에 대해 남기는 기록이다.
이 도메인은 서비스의 핵심 리텐션 장치이며, 다음의 강한 불변식을 가진다.

* 한 사용자는 **하루에 Record 1개만 작성 가능**
* Record는 반드시 **현재 Active Path에 귀속**된다
* Record는 공개/비공개 상태를 가질 수 있다

---

## 2. 도메인 불변식 (Invariants)

### 2.1 하루 1개 기록 제약

* 기준: `userId + recordDate`
* DB 레벨에서 **UNIQUE 제약**으로 보장
* 동일 날짜에 재요청 시 생성이 아닌 **에러 반환**

### 2.2 Active Path 연동

* Record 생성 시점에 사용자의 Active Path가 반드시 존재해야 함
* Active Path가 없는 경우 Record 생성 불가
* Record는 Path 종료 이후에도 **이력 데이터로 유지**됨

### 2.3 수정 정책

* Record는 **작성 당일에만 수정 가능**
* 날짜가 넘어간 Record는 읽기 전용

---


## 3. 필드 설명

### Record 공통 필드

| 필드         | 타입            | 설명                           |
| ---------- | ------------- | ---------------------------- |
| id         | Long          | Record 식별자                   |
| pathId     | Long          | 기록이 귀속된 Path ID              |
| recordDate | LocalDate     | 기록 날짜 (서버 기준)                |
| content    | String        | 사용자가 작성한 오늘의 기록 내용           |
| visibility | String        | 공개 여부 (`PUBLIC` / `PRIVATE`) |
| createdAt  | LocalDateTime | 기록 생성 시각                     |
| updatedAt  | LocalDateTime | 기록 수정 시각                     |

---

## Endpoint 목록

### 1. 오늘의 Record 생성

`POST /api/records`

#### Auth

* 로그인 사용자

#### Request Body

```json
{
  "content": "오늘은 집중이 잘 됐다",
  "visibility": "PUBLIC"
}
```

#### Response (201)

```json
{
  "id": 1203,
  "pathId": 55,
  "recordDate": "2026-02-08",
  "content": "오늘은 집중이 잘 됐다",
  "visibility": "PUBLIC",
  "createdAt": "2026-02-08T00:12:31"
}
```

---

### 2. 오늘의 Record 조회

`GET /api/records/today`

#### Auth

* 로그인 사용자

#### Response

* 200 OK (존재 시)

```json
{
  "id": 1203,
  "pathId": 55,
  "recordDate": "2026-02-08",
  "content": "오늘은 집중이 잘 됐다",
  "visibility": "PUBLIC",
  "createdAt": "2026-02-08T00:12:31"
}
```

* 204 No Content (미존재 시)

---

### 3. Record 수정

`PUT /api/records/{recordId}`

#### Auth

* 작성자 본인

#### Request Body

```json
{
  "content": "수정된 기록",
  "visibility": "PRIVATE"
}
```

#### Response (200)

```json
{
  "id": 1203,
  "content": "수정된 기록",
  "visibility": "PRIVATE",
  "updatedAt": "2026-02-08T09:41:10"
}
```

---

### 4. Record 공개 상태 변경

`PATCH /api/records/{recordId}/visibility`

#### Request Body

```json
{
  "visibility": "PUBLIC"
}
```

#### Response (200)

```json
{
  "id": 1203,
  "visibility": "PUBLIC"
}
```


---

## 5. 패키지 구조

```
kr.co.quietpath.api.record
 ├─ RecordController
 ├─ RecordRequest
 ├─ RecordResponse

kr.co.quietpath.domain.record
 ├─ entity.Record
 ├─ repository.RecordRepository
 ├─ service.RecordService
```

---

## 6. 성능 및 확장 포인트

* Record 단건 조회는 캐시 대상 아님 (쓰기 중심)
* 공개 Record는 Feed / Top3 조회 시 Read Model로 분리
* 향후 AI 요약 파이프라인의 **입력 데이터**로 사용

---


