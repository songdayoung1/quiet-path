# Comment (댓글)

## 1. 개요

Comment는 사용자가 공개된 콘텐츠(Record)에 대해 댓글을 남기는 기능이다.
커뮤니티 상호작용의 핵심이며, 대상의 공개 정책과 작성자 권한을 엄격히 강제한다.

* v1 대상: **Record**
* 댓글은 목록 조회(대화 흐름)를 고려해 **정렬/페이징**을 지원한다.

---

## 2. 도메인 불변식 (Invariants)

### 2.1 공개 대상 제약

* v1: **공개(PUBLIC) Record에만 댓글 허용**
* PRIVATE Record는 댓글 작성/조회 불가(403 TARGET_NOT_PUBLIC)

### 2.2 작성자 권한

* 댓글 수정/삭제는 **작성자 본인만 가능**
* 본인이 아닌 경우 403 NOT_OWNER

### 2.3 삭제 정책

* v1: **soft delete** 적용

    * 삭제 시 레코드는 유지하고, `deleted=true`로 상태만 변경
    * 삭제된 댓글은 목록 조회 결과에서 제외한다

---

## 3. 필드 설명

### Comment 공통 필드

| 필드         | 타입            | 설명                   |
| ---------- | ------------- | -------------------- |
| commentId  | Long          | Comment 식별자          |
| recordId   | Long          | 대상 Record ID         |
| userId     | Long          | 작성자 ID               |
| content    | String        | 댓글 내용                |
| commentCount | long        | 활성 댓글 수             |
| deleted    | boolean       | 삭제 여부                |
| createdAt  | LocalDateTime | 생성 시각                |
| updatedAt  | LocalDateTime | 수정 시각                |
| deletedAt  | LocalDateTime | 삭제 시각                |

### Comment 목록 응답 필드

| 필드            | 타입   | 설명             |
| ------------- | ---- | -------------- |
| items         | List | 댓글 리스트         |
| page          | int  | 페이지 번호(0-base) |
| size          | int  | 페이지 크기         |
| totalElements | long | 전체 댓글 수        |
| totalPages    | int  | 전체 페이지 수       |

---

## Endpoint 목록

> Base Path: `/api/v1`

### 1. 댓글 작성

`POST /api/v1/comments`

#### Auth

* 로그인 사용자

#### Request Body

```json
{
  "recordId": 1203,
  "content": "좋은 기록이네요"
}
```

#### Response (201)

```json
{
  "commentId": 9001,
  "recordId": 1203,
  "userId": 12,
  "content": "좋은 기록이네요",
  "commentCount": 8,
  "deleted": false,
  "createdAt": "2026-02-08T10:12:31"
}
```

---

### 2. 댓글 목록 조회

`GET /api/v1/comments`

#### Auth

* 로그인 사용자

#### Query Params

| 파라미터       | 타입     | 필수       | 설명           |
| ---------- | ------ | -------- | ------------ |
| recordId   | Long   | required | Record ID    |
| page       | int    | 선택       | 기본 0         |
| size       | int    | 선택       | 기본 20, 최대 50 |

예시:

* `/api/v1/comments?recordId=1203&page=0&size=20`

#### Response (200)

```json
{
  "items": [
    {
      "commentId": 9001,
      "userId": 12,
      "nickname": "song",
      "profileImageUrl": "https://...",
      "content": "좋은 기록이네요",
      "deleted": false,
      "createdAt": "2026-02-08T10:12:31",
      "updatedAt": "2026-02-08T10:12:31"
    },
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

---

### 3. 댓글 수정

`PUT /api/v1/comments/{commentId}`

#### Auth

* 작성자 본인

#### Request Body

```json
{
  "content": "내용을 수정했습니다"
}
```

#### Response (200)

```json
{
  "commentId": 9001,
  "recordId": 1203,
  "commentCount": 8,
  "content": "내용을 수정했습니다",
  "updatedAt": "2026-02-08T11:01:00"
}
```

---

### 4. 댓글 삭제

`DELETE /api/v1/comments/{commentId}`

#### Auth

* 작성자 본인

#### Response (200)

```json
{
  "commentId": 9001,
  "recordId": 1203,
  "commentCount": 7,
  "deleted": true,
  "deletedAt": "2026-02-08T11:10:00"
}
```

---

## 5. 패키지 구조

```
kr.co.quietpath.api.comment
 ├─ controller.CommentController
 ├─ service.CommentService
 ├─ dto.request
 │   ├─ CommentCreateRequest
 │   ├─ CommentUpdateRequest
 │   └─ CommentListQuery
 └─ dto.response
     ├─ CommentCreateResponse
     ├─ CommentUpdateResponse
     ├─ CommentDeleteResponse
     └─ CommentListResponse

kr.co.quietpath.domain.comment
 ├─ entity.Comment
 └─ repository.CommentRepository

kr.co.quietpath.domain.record
 ├─ entity.Record
 └─ repository.RecordRepository
```

---

## 6. Validation

* `@Valid` 사용
* RequestBody 필수값 검증

    * recordId (required)
    * content (required, 공백 불가, 길이 제한은 정책 확정 시 추가)
* QueryParams

    * size 최대 50

---

## 7. 예외 처리

* 403: TARGET_NOT_PUBLIC, NOT_OWNER
* 404: TARGET_NOT_FOUND, COMMENT_NOT_FOUND

---

## 8. 추후 성능 및 확장 포인트

* v1은 offset pagination(page/size) 기반으로 시작
* 트래픽 증가 시 cursor pagination으로 확장 가능
* 삭제된 댓글 노출 정책(완전 제외 vs 마스킹)은 v2에서 확정 가능
