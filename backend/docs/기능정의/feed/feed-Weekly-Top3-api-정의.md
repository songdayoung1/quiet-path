# Feed / Weekly Top3

## 1. 개요

Weekly Top3는 최근 7일간 공감(Reaction) 수 기준으로 **가장 많이 공감 받은 Path 3개**를 반환하는 피드 하이라이트 API다.
메인 화면 진입 시 호출되는 **고트래픽 Read API**이며, Feed/Top3 성능 최적화를 위해 **캐시 전략**을 핵심으로 설계한다.

---

## 2. 도메인 불변식 (Invariants)

### 2.1 집계 윈도우 규칙

* 기준: **KST 기준 최근 7일**
* 집계 구간: `now-7days ~ now`
* 응답에는 집계 구간을 `window.from/to`로 명시한다.

### 2.2 Top3 산정 규칙

* 정렬 우선순위

    1. `reactionCount DESC`
    2. 동률 시 `updatedAt DESC`
    3. 그 다음 `pathId DESC` (deterministic)
* 결과는 최대 **3개**만 반환한다.

### 2.3 제외 대상

* 삭제된 Path는 제외한다.
* (정책 확정 전) 비공개 Path가 존재한다면 제외한다.

---

## 3. 필드 설명

### WeeklyTop3 응답 공통 필드

| 필드          | 타입        | 설명          |
| ----------- | --------- | ----------- |
| window.from | LocalDate | 집계 시작일(KST) |
| window.to   | LocalDate | 집계 종료일(KST) |
| items       | List      | Top3 카드 리스트 |

### Top3 카드 필드(items[])

| 필드                    | 타입            | 설명                   |
| --------------------- | ------------- | -------------------- |
| rank                  | int           | 1~3 순위               |
| pathId                | Long          | Path 식별자             |
| title                 | String        | Path 제목              |
| status                | String        | `ACTIVE` / `ENDED`   |
| owner.userId          | Long          | 작성자 ID               |
| owner.nickname        | String        | 작성자 닉네임              |
| owner.profileImageUrl | String        | 작성자 프로필 이미지          |
| reactionCount         | long          | 최근 7일 공감 집계값         |
| isReacted             | boolean       | 내가 공감했는지 여부(개인화 1필드) |
| createdAt             | LocalDateTime | 생성 시각                |
| updatedAt             | LocalDateTime | 수정 시각                |

> 주의: Weekly Top3는 “전체 공통”이지만 `isReacted`는 요청자(userId) 기반으로 계산될 수 있다.

---

## Endpoint 목록

> Base Path: `/api/v1`

### 1. Weekly Top3 조회

`GET /api/v1/feed/weekly-top3`

#### Auth

* 로그인 사용자(JWT)

#### Query Params

* 없음

#### Response (200)

```json
{
  "window": {
    "from": "2026-02-01",
    "to": "2026-02-08"
  },
  "items": [
    {
      "rank": 1,
      "pathId": 101,
      "title": "조용히 30일 루틴",
      "status": "ACTIVE",
      "owner": {
        "userId": 12,
        "nickname": "song",
        "profileImageUrl": "https://..."
      },
      "reactionCount": 57,
      "isReacted": true,
      "createdAt": "2026-02-03T10:12:00",
      "updatedAt": "2026-02-05T09:30:00"
    },
    {
      "rank": 2,
      "pathId": 99,
      "title": "하루 10분 정리",
      "status": "ENDED",
      "owner": {
        "userId": 33,
        "nickname": "mori",
        "profileImageUrl": "https://..."
      },
      "reactionCount": 41,
      "isReacted": false,
      "createdAt": "2026-01-29T14:20:00",
      "updatedAt": "2026-02-02T18:01:00"
    }
  ]
}
```

---

## 5. 패키지 구조

```
kr.co.quietpath.api.feed
 ├─ controller.FeedController
 ├─ service.FeedService
 ├─ dto.request
 │   └─ (none)
 └─ dto.response
     ├─ WeeklyTop3Response
     ├─ WeeklyTop3Window
     └─ WeeklyTop3Item

kr.co.quietpath.domain
 ├─ path
 │   ├─ entity.Path
 │   └─ repository.PathRepository
 ├─ reaction
 │   ├─ entity.Reaction
 │   └─ repository.ReactionRepository
 └─ user
     ├─ entity.User
     └─ repository.UserRepository
```

---

## 6. 추후 성능 및 확장 포인트

### 6.1 캐시 키

* Key: `feed:weeklyTop3:{yyyyMMdd}`

    * 예: `feed:weeklyTop3:20260208`

### 6.2 TTL

* 기본 TTL: **10분 + jitter(0~120초)**
* 목적: 캐시 스탬피드/동시 갱신(Thundering Herd) 완화

### 6.3 캐시 미스 처리(기본)

* 캐시 미스

    1. DB에서 최근 7일 공감 집계
    2. Top3 산출
    3. 캐시에 저장
    4. 응답

### 6.4 스탬피드 방지(권장)

* 분산락 키: `lock:feed:weeklyTop3:{yyyyMMdd}`
* 락 획득 성공한 인스턴스만 DB 집계를 수행
* 실패한 요청은 짧게 대기 후 캐시 재조회(이중 확인)

### 6.5 `isReacted` 처리 전략(권장: 2단 구성)

* Top3 리스트(3개) 자체는 **전체 공통 캐시**로 저장
* `isReacted`는 요청자 기준이므로 캐시 값에 넣지 않고, 아래 중 하나로 계산

    1. `ReactionRepository`로 `userId + pathIds IN (...)` 조회하여 매핑
    2. Redis Set/Bitmap 등으로 사용자 공감 여부를 별도 Read Model로 유지(확장)

---

