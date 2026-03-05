# Quiet-Path API Spec (v1) — PATH 기능

패키지 기준: 기능별(api 중심)로 구성  
예) `kr.co.quietpath.api.path.controller`, `kr.co.quietpath.api.path.service`, `kr.co.quietpath.api.path.dto`

네이밍 규칙:
- `memberId` 사용 금지
- 전부 `userId`로 통일

---

# 1. 패키지 구조

## 1.1 Controller
- `kr.co.quietpath.api.path.controller.PathController`

## 1.2 Service
- `kr.co.quietpath.api.path.service.PathService`

## 1.3 DTO
- `kr.co.quietpath.api.path.dto.request.PathCreateRequest`
- `kr.co.quietpath.api.path.dto.request.PathFinishRequest`
- `kr.co.quietpath.api.path.dto.response.PathActiveResponse`
- `kr.co.quietpath.api.path.dto.response.PathCreateResponse`
- `kr.co.quietpath.api.path.dto.response.PathFinishResponse`
- `kr.co.quietpath.api.path.dto.response.PathListResponse`
- `kr.co.quietpath.api.path.dto.response.PathListItem`
- `kr.co.quietpath.api.path.dto.response.PathDetailResponse`
- `kr.co.quietpath.api.path.dto.response.PathRecordItem`

> Entity / Repository는 기존 도메인 패키지 사용  
> 예) `kr.co.quietpath.domain.path.entity.Path`

---

# 2. Path 기능 정의 (UX 기준)

## 2.1 Compass
- 현재 진행 중인 방향 조회

## 2.2 New Direction
- 새 방향 생성

## 2.3 Finish Direction
- 진행 중인 방향 종료

## 2.4 Past Flows
- 과거 방향 목록 조회

## 2.5 Path Detail
- 과거 방향 상세 조회 (락 / 타임 앵커 포함)

---

# 3. 핵심 불변식

## 3.1 ACTIVE Path 제약
- 유저당 ACTIVE Path는 1개만 존재

## 3.2 상태 전이
- ACTIVE → FINISHED 만 허용

## 3.3 종료 처리
- Path 종료 시 `User.currentPath = null`

---

# 4. API 정의

## 4.1 현재 진행 중 방향 조회 (Compass)

### Endpoint
`GET /api/v1/paths/active`

### 인증
- JWT 인증 필요
- Controller에서 `userId` 추출

### Response (ACTIVE 존재)
```json
{
  "pathId": 10,
  "keyQuestion": "나는 더 단순해지고 있는가?",
  "description": "오늘의 공부",
  "status": "ACTIVE",
  "startDate": "2026-02-08",
  "endDate": "2026-02-18"
}
```

### Response (ACTIVE 없음)
```json
{
  "pathId": null
}
```

---


# 4.2 새 방향 생성 (New Direction)

## Endpoint
POST /api/v1/paths

## Request
```json
{
  "keyQuestion": "나는 더 단순해지고 있는가?",
  "description": "오늘의 공부",
  "durationType": "DAYS_7",
  "endDate": "2026-02-18"
}
```

## durationType 예시 (Enum)
- DAYS_7
- DAYS_30
- DAYS_90
- CUSTOM


## 규칙
- ACTIVE Path가 이미 존재하면 409
- startDate는 서버 기준 오늘 날짜
- durationType이 CUSTOM이면 endDate 필수
- endDate는 startDate 이후여야 함


## Response
```json
{
  "pathId": 10,
  "status": "ACTIVE",
  "startDate": "2026-02-08",
  "endDate": "2026-02-18"
}
```

## Error

- 409 PATH_ALREADY_ACTIVE (유저가 이미 진행중인 방향이 있을 때)
- 400 INVALID_PERIOD
- 400 KEY_QUESTION_REQUIRED


---


# 4.3 방향 종료 (마무리하고 변경하기)

## Endpoint
POST /api/v1/paths/{pathId}/finish

## 규칙
- 본인의 ACTIVE Path만 종료 가능
- user.currentPath.id == pathId 검증
- ACTIVE 상태가 아니면 종료 불가

## Response

```json
{
  "pathId": 10,
  "status": "FINISHED",
  "finishedAt": "2026-02-10T00:00:00Z"
}
```

## Error
- 403 NOT_OWNER
- 409 PATH_NOT_ACTIVE

---


# 4.4 과거 방향 리스트 (Past Flows)

## Endpoint
GET /api/v1/paths?status=FINISHED&size=20&cursor=...

## 규칙
- 정렬: finishedAt desc, id desc
- 커서 페이징 사용
- 목록은 가벼운 DTO로 조회

## Response

```json
{
  "items": [
    {
      "pathId": 9,
      "startDate": "2026-01-01",
      "endDate": "2026-01-30",
      "keyQuestion": "이번 기간, 이 방향으로 얼마나 움직였나?"
    }
  ],
  "nextCursor": "2026-01-30T00:00:00Z,9"
}
```

---


# 4.5 Path 상세 조회 (락 / 타임 앵커 포함)

## Endpoint
GET /api/v1/paths/{pathId}

## 규칙
- 본인 Path만 조회 가능 (정책 선택)
- 타임 앵커 기준으로 요약 잠금 상태 계산

## summaryStatus
- LOCKED : unlockAt 이전
- UNLOCKED : unlockAt 이후
- DONE : 요약 생성 완료

## Response

```json
{
  "pathId": 10,
  "keyQuestion": "이번 기간, 이 방향으로 얼마나 움직였나?",
  "description": "오늘의 공부",
  "status": "FINISHED",
  "period": {
    "startDate": "2026-02-08",
    "endDate": "2026-02-18"
  },
  "summary": null,
  "summaryStatus": "LOCKED",
  "unlockAt": "2026-02-10",
  "records": [
    {
      "recordId": 501,
      "date": "2026-02-08",
      "preview": "멍때림..",
      "moodText": "흐림"
    }
  ]
}
```

## Error
- 404 PATH_NOT_FOUND
- 403 NOT_OWNER (본인 path만 조회 정책일 때)

----


# 5 Service 구현 요구사항 (PathService)
## 5.1 메서드 시그니처(권장)

- PathActiveResponse getActivePath(Long userId)
- PathCreateResponse createPath(Long userId, PathCreateRequest request)
- PathFinishResponse finishPath(Long userId, Long pathId)
- PathListResponse getPastPaths(Long userId, String cursor, int size)
- PathDetailResponse getPathDetail(Long userId, Long pathId)

## 5.2 createPath 핵심 로직

- user 조회
- user.currentPath != null 이면 409
- request 검증 (keyQuestion, 기간)
- Path 생성
- user.setActivePath(path) 호출로 불변식 유지
- 저장

## 5.3 finishPath 핵심 로직

- user.currentPath.id == pathId 검증
- Path.status == ACTIVE 검증
- path.finish()
- user.clearActivePath()


---

# 6. Controller 구현 요구사항 (PathController)

- @AuthenticationPrincipal 로 userId를 받는다
- request validation(@Valid) 적용
예외는 GlobalExceptionHandler에서 코드 매핑