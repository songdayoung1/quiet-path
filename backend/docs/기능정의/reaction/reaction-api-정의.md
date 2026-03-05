# Reaction (공감)

## 1. 개요

Reaction은 사용자가 공개된 콘텐츠(Record)에 대해 공감을 남기는 기능이다.
Feed/Top3(Weekly) 집계의 기반 데이터이며, 다음 불변식을 강제한다.

---

## 2. 도메인 불변식 (Invariants)

### 2.1 중복 공감 방지

* 기준: `userId + targetType + targetId`
* DB 레벨에서 **UNIQUE 제약**으로 보장
* 동일 대상에 재요청 시 **에러 반환(409 REACTION_ALREADY_EXISTS)**

### 2.2 취소 정책

* 공감은 취소 가능(v1)
* 취소는 **본인 공감만 가능**

### 2.3 공개 대상 제약

* v1: **공개(PUBLIC) Record에만 공감 허용**
* PRIVATE Record는 공감 불가(403 TARGET_NOT_PUBLIC)

---

## 3. 필드 설명

### Reaction 공통 필드

| 필드         | 타입            | 설명                   |
| ---------- | ------------- | -------------------- |
| reactionId | Long          | Reaction 식별자         |
| targetType | String        | 대상 타입 (v1: `RECORD`) |
| targetId   | Long          | 대상 ID (Record ID)    |
| reactedAt  | LocalDateTime | 공감 생성 시각             |

### Reaction 상태 필드(응답용)

| 필드            | 타입      | 설명          |
| ------------- | ------- | ----------- |
| reacted       | boolean | 내가 공감했는지 여부 |
| reactionCount | long    | 대상의 총 공감 수  |

---

## Endpoint 목록

> Base Path: `/api/v1`

### 1. 공감 추가

`POST /api/v1/reactions`

#### Auth

* 로그인 사용자

#### Request Body

```json
{
  "targetType": "RECORD",
  "targetId": 1203
}
```

#### Response (201)

```json
{
  "reactionId": 9001,
  "targetType": "RECORD",
  "targetId": 1203,
  "reacted": true,
  "reactionCount": 31,
  "reactedAt": "2026-02-08T10:12:31"
}
```

---

### 2. 공감 취소

`DELETE /api/v1/reactions`

#### Auth

* 로그인 사용자

#### Request Body

```json
{
  "targetType": "RECORD",
  "targetId": 1203
}
```

#### Response (200)

```json
{
  "targetType": "RECORD",
  "targetId": 1203,
  "reacted": false,
  "reactionCount": 30
}
```

---

### 3. 내가 공감했는지 조회

`GET /api/v1/reactions/me`

#### Auth

* 로그인 사용자

#### Query Params

* targetType (required): `RECORD`
* targetId (required): Long

예시:

* `/api/v1/reactions/me?targetType=RECORD&targetId=1203`

#### Response (200)

```json
{
  "targetType": "RECORD",
  "targetId": 1203,
  "reacted": true
}
```

---

### 4. 대상 공감 수 조회

`GET /api/v1/reactions/count`

#### Auth

* (v1) 비로그인 허용 가능 (정책에 따름)

#### Query Params

* targetType (required): `RECORD`
* targetId (required): Long

예시:

* `/api/v1/reactions/count?targetType=RECORD&targetId=1203`

#### Response (200)

```json
{
  "targetType": "RECORD",
  "targetId": 1203,
  "reactionCount": 31
}
```

---

## 5. 패키지 구조

```
kr.co.quietpath.api.reaction
 ├─ controller.ReactionController
 ├─ service.ReactionService
 ├─ dto.request
 │   ├─ ReactionCreateRequest
 │   ├─ ReactionDeleteRequest
 │   └─ ReactionMeQuery
 └─ dto.response
     ├─ ReactionCreateResponse
     ├─ ReactionDeleteResponse
     ├─ ReactionMeResponse
     └─ ReactionCountResponse

kr.co.quietpath.domain.reaction
 ├─ entity.Reaction
 ├─ repository.ReactionRepository
```

---

## 6. 성능 및 확장 포인트

* v1은 DB 집계를 기본으로 하되, Feed/Top3 성능 요구가 생기면 **카운트 Read Model**로 분리
* Hot Record에 대한 count 조회가 많아지면 캐시 적용(TTL + jitter)
* 향후 비동기 집계(이벤트 기반)로 확장 가능
