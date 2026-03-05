# Feed (일반 피드)

## 1. 개요

Feed(일반 피드)는 공개된 Path/Record를 **최신순으로 조회**하기 위한 읽기 전용 API다.
메인 피드 화면의 기본 리스트를 구성하며, Weekly Top3와 달리 **개별 아이템 단위의 조회 흐름**에 초점을 둔다.

---

## 2. 도메인 불변식 (Invariants)

### 2.1 공개 대상만 노출

* v1 기준 **공개(PUBLIC) 상태의 Path/Record만 피드에 노출**된다.
* PRIVATE 대상은 어떤 경우에도 피드에 포함되지 않는다.

### 2.2 정렬 규칙

* 기본 정렬은 **최신순(createdAt DESC)** 이다.
* 동일 시각일 경우 `id DESC`로 deterministic 정렬을 보장한다.

### 2.3 조회 전용

* Feed API는 조회(Read) 전용이다.
* 생성/수정/삭제는 다른 도메인 API에서만 처리한다.

---

## 3. 필드 설명

### Feed 응답 공통 필드

| 필드         | 타입      | 설명            |
| ---------- | ------- | ------------- |
| items      | List    | 피드 카드 리스트     |
| hasNext    | boolean | 다음 페이지 존재 여부  |
| nextCursor | String  | 다음 페이지 조회용 커서 |

### Feed 카드 필드(items[])

| 필드                    | 타입            | 설명                 |
| --------------------- | ------------- | ------------------ |
| pathId                | Long          | Path 식별자           |
| recordId              | Long          | Record 식별자         |
| title                 | String        | Path 또는 Record 제목  |
| content               | String        | Record 요약 내용       |
| status                | String        | `ACTIVE` / `ENDED` |
| owner.userId          | Long          | 작성자 ID             |
| owner.nickname        | String        | 작성자 닉네임            |
| owner.profileImageUrl | String        | 작성자 프로필 이미지        |
| reactionCount         | long          | 대상의 총 공감 수         |
| isReacted             | boolean       | 내가 공감했는지 여부        |
| createdAt             | LocalDateTime | 생성 시각              |

---

## Endpoint 목록

> Base Path: `/api/v1`

### 1. 일반 피드 조회

`GET /api/v1/feed`

#### Auth

* 로그인 사용자(JWT)

#### Query Params

| 파라미터   | 타입     | 필수 | 설명                    |
| ------ | ------ | -- | --------------------- |
| size   | int    | 선택 | 페이지 크기 (기본 20, 최대 50) |
| cursor | String | 선택 | 커서 기반 페이지네이션용 값       |

> v1에서는 cursor 기반 페이지네이션을 사용한다.

#### Response (200)

```json
{
  "items": [
    {
      "pathId": 101,
      "recordId": 555,
      "title": "조용히 30일 루틴",
      "content": "오늘은 10분 명상을 했다",
      "status": "ACTIVE",
      "owner": {
        "userId": 12,
        "nickname": "song",
        "profileImageUrl": "https://..."
      },
      "reactionCount": 31,
      "isReacted": true,
      "createdAt": "2026-02-08T09:12:00"
    }
  ],
  "hasNext": true,
  "nextCursor": "2026-02-08T09:12:00_555"
}
```

---

## 5. 패키지 구조

```
kr.co.quietpath.api.feed
 ├─ controller.FeedController
 ├─ service.FeedService
 ├─ dto.request
 │   └─ FeedQuery
 └─ dto.response
     ├─ FeedResponse
     ├─ FeedItem
     └─ OwnerSummary

kr.co.quietpath.domain
 ├─ path
 │   ├─ entity.Path
 │   └─ repository.PathRepository
 ├─ record
 │   ├─ entity.Record
 │   └─ repository.RecordRepository
 ├─ reaction
 │   ├─ entity.Reaction
 │   └─ repository.ReactionRepository
 └─ user
     ├─ entity.User
     └─ repository.UserRepository
```

---

## 6. 페이징 설계

* cursor 포맷 예시: `{createdAt}_{id}`
* 조회 조건

    * `createdAt < cursor.createdAt`
    * 또는 `(createdAt == cursor.createdAt AND id < cursor.id)`

> offset 기반 페이지네이션은 대용량 데이터에서 성능 저하 우려로 v1에서 사용하지 않는다.

---

## 7. 테스트 체크리스트

* [ ] 최신순 정렬 검증
* [ ] cursor 페이징 정상 동작
* [ ] PRIVATE 데이터 미노출
* [ ] isReacted 정확성(userId 기준)
