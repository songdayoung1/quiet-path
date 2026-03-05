# Notification (인앱 알림)

## 1. 개요

Notification은 서비스 내에서 발생한 이벤트(댓글/공감 등)를 사용자에게 **인앱(In-app) 형태로 전달**하는 기능이다.
본 문서의 Notification은 **푸시(FCM/APNs)가 아닌, 앱 내부 알림 목록(벨 아이콘/알림함)** 을 의미한다.

* v1 알림 소스: `COMMENT_CREATED`, `REACTION_CREATED`
* 알림은 DB에 저장되는 도메인 데이터이며, 조회/읽음 처리 API를 제공한다.

---

## 2. 도메인 불변식 (Invariants)

### 2.1 수신자(Recipient) 고정

* 각 알림은 특정 사용자(`recipientUserId`)에 귀속된다.
* 알림 조회/읽음 처리는 **수신자 본인만 가능**

    * 위반 시 403 NOT_OWNER

### 2.2 자기 자신 이벤트 제외

* 사용자가 본인의 Record에 댓글/공감을 남긴 경우

    * v1: **알림 생성하지 않음** (self-notification 방지)

### 2.3 읽음 처리 멱등성

* 읽음 처리 API는 멱등성을 가진다.

    * 이미 읽은 알림을 다시 읽음 처리해도 200으로 동일 결과를 반환

---

## 3. 필드 설명

### Notification 공통 필드

| 필드                    | 타입            | 설명                                            |
| --------------------- | ------------- | --------------------------------------------- |
| notificationId        | Long          | Notification 식별자                              |
| recipientUserId       | Long          | 수신자 사용자 ID                                    |
| type                  | String        | 알림 타입 (`COMMENT_CREATED`, `REACTION_CREATED`) |
| actor.userId          | Long          | 이벤트 발생자 ID                                    |
| actor.nickname        | String        | 이벤트 발생자 닉네임                                   |
| actor.profileImageUrl | String        | 이벤트 발생자 프로필 이미지                               |
| targetType            | String        | 대상 타입 (v1: `RECORD`)                          |
| targetId              | Long          | 대상 ID (Record ID)                             |
| message               | String        | 알림 메시지(서버 생성)                                 |
| read                  | boolean       | 읽음 여부                                         |
| createdAt             | LocalDateTime | 생성 시각                                         |
| readAt                | LocalDateTime | 읽음 처리 시각                                      |

---

## Endpoint 목록

> Base Path: `/api/v1`

### 1. 알림 목록 조회

`GET /api/v1/notifications`

#### Auth

* 로그인 사용자

#### Query Params

| 파라미터       | 타입      | 필수 | 설명                      |
| ---------- | ------- | -- | ----------------------- |
| page       | int     | 선택 | 기본 0                    |
| size       | int     | 선택 | 기본 20, 최대 50            |
| unreadOnly | boolean | 선택 | true면 미읽음만 조회(기본 false) |

예시:

* `/api/v1/notifications?page=0&size=20`
* `/api/v1/notifications?unreadOnly=true`

#### Response (200)

```json
{
  "items": [
    {
      "notificationId": 9001,
      "type": "COMMENT_CREATED",
      "actor": {
        "userId": 33,
        "nickname": "mori",
        "profileImageUrl": "https://..."
      },
      "targetType": "RECORD",
      "targetId": 1203,
      "message": "mori님이 내 기록에 댓글을 남겼습니다",
      "read": false,
      "createdAt": "2026-02-08T10:12:31",
      "readAt": null
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

---

### 2. 알림 읽음 처리

`PATCH /api/v1/notifications/{notificationId}/read`

#### Auth

* 로그인 사용자(수신자 본인)

#### Response (200)

```json
{
  "notificationId": 9001,
  "read": true,
  "readAt": "2026-02-08T11:10:00"
}
```

---

### 3. 전체 읽음 처리

`PATCH /api/v1/notifications/read-all`

#### Auth

* 로그인 사용자

#### Response (200)

```json
{
  "updatedCount": 5
}
```

---

## 5. 패키지 구조

```
kr.co.quietpath.api.notification
 ├─ controller.NotificationController
 ├─ service.NotificationService
 ├─ dto.request
 │   ├─ NotificationListQuery
 │   └─ (none)
 └─ dto.response
     ├─ NotificationListResponse
     ├─ NotificationItem
     ├─ NotificationReadResponse
     ├─ NotificationReadAllResponse
     └─ ActorSummary

kr.co.quietpath.domain.notification
 ├─ entity.Notification
 └─ repository.NotificationRepository

kr.co.quietpath.domain.user
 ├─ entity.User
 └─ repository.UserRepository
```

---

## 6. Validation

* `@Valid` 사용
* QueryParams

    * size 최대 50
* PathVariable

    * notificationId는 양수(@Positive)

---

## 7. 예외 처리

* 403: NOT_OWNER
* 404: NOTIFICATION_NOT_FOUND

---

## 8. 생성 트리거(내부 규칙)

> v1에서는 별도 공개 Endpoint로 알림 생성 API를 제공하지 않는다.

* 댓글 생성 시

    * `COMMENT_CREATED` 알림 생성
* 공감 생성 시

    * `REACTION_CREATED` 알림 생성
* self-notification 방지

    * actorUserId == recipientUserId 인 경우 알림 생성하지 않음

---

## 9. 추후 성능 및 확장 포인트

* v1은 DB 기반 offset pagination(page/size)
* 트래픽 증가 시 cursor pagination으로 확장 가능
* 푸시/이메일은 Notification 생성 이벤트를 기준으로 별도 채널로 확장 가능(FCM 등)
