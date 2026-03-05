# Record Detail (공개 Record 조회)

## 1. 개요

Record Detail은 특정 Record를 상세 조회하는 API다.
기존 "오늘의 기록" API가 **본인 중심(작성/수정/오늘 조회)** 이라면,
본 API는 **커뮤니티 흐름(Feed → 상세 → 댓글/공감)** 을 위한 조회 전용 API다.

* PUBLIC Record: 누구나 조회 가능(로그인 전제)
* PRIVATE Record: 작성자 본인만 조회 가능

---

## 2. 도메인 불변식 (Invariants)

### 2.1 공개/비공개 접근 정책

* Record가 `PUBLIC`이면 조회 허용
* Record가 `PRIVATE`이면 **작성자만 조회 허용**

    * 작성자가 아니면 403 RECORD_NOT_PUBLIC

### 2.2 조회 대상 존재

* 존재하지 않는 recordId면 404 RECORD_NOT_FOUND

### 2.3 조회 전용

* 본 API는 Read-only
* 수정/삭제/공개 전환은 Record(오늘의 기록) API에서 처리

---

## 3. 필드 설명

### Record Detail 응답 필드

| 필드                    | 타입            | 설명                   |
| --------------------- | ------------- | -------------------- |
| id                    | Long          | Record 식별자           |
| pathId                | Long          | 귀속 Path ID           |
| recordDate            | LocalDate     | 기록 날짜                |
| content               | String        | 기록 내용                |
| visibility            | String        | `PUBLIC` / `PRIVATE` |
| owner.userId          | Long          | 작성자 ID               |
| owner.nickname        | String        | 작성자 닉네임              |
| owner.profileImageUrl | String        | 작성자 프로필 이미지          |
| reactionCount         | long          | 대상 총 공감 수            |
| isReacted             | boolean       | 내가 공감했는지 여부          |
| commentCount          | long          | 댓글 수                 |
| createdAt             | LocalDateTime | 생성 시각                |
| updatedAt             | LocalDateTime | 수정 시각                |

---

## Endpoint 목록

> Base Path: `/api/v1`

### 1. Record 상세 조회

`GET /api/v1/records/{recordId}`

#### Auth

* 로그인 사용자(JWT)

#### Path Variable

* recordId (required): Long

#### Response (200)

```json
{
  "id": 1203,
  "pathId": 55,
  "recordDate": "2026-02-08",
  "content": "오늘은 집중이 잘 됐다",
  "visibility": "PUBLIC",
  "owner": {
    "userId": 12,
    "nickname": "song",
    "profileImageUrl": "https://..."
  },
  "reactionCount": 31,
  "isReacted": true,
  "commentCount": 2,
  "createdAt": "2026-02-08T00:12:31",
  "updatedAt": "2026-02-08T09:41:10"
}
```

---

## 5. 패키지 구조

> 기존 Record 기능 패키지에 "조회" 엔드포인트를 추가한다.

```
kr.co.quietpath.api.record
 ├─ controller.RecordController
 ├─ service.RecordService
 ├─ dto.request
 │   └─ (none)
 └─ dto.response
     ├─ RecordDetailResponse
     └─ OwnerSummary

kr.co.quietpath.domain
 ├─ record
 │   ├─ entity.Record
 │   └─ repository.RecordRepository
 ├─ reaction
 │   ├─ entity.Reaction
 │   └─ repository.ReactionRepository
 ├─ comment
 │   ├─ entity.Comment
 │   └─ repository.CommentRepository
 └─ user
     ├─ entity.User
     └─ repository.UserRepository
```

---

## 6. Validation

* Controller에 `@Validated` 적용
* recordId는 양수 검증(@Positive)

---

## 7. 예외 처리

* 403: RECORD_NOT_PUBLIC (PRIVATE인데 작성자 아님)
* 404: RECORD_NOT_FOUND

---

## 8. 성능 및 확장 포인트

* v1은 DB 조회 기반
* 상세 조회 시 필요한 데이터

    * Record 단건
    * reactionCount, isReacted
    * commentCount
    * owner 요약 정보
* N+1 방지

    * owner는 join fetch 또는 UserRepository IN 조회로 해결
    * reaction/comment count는 각각 count 쿼리로 처리(단건이므로 2~3회 쿼리 허용)
