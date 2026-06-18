# Quiet Path AI 요약 1차 설계

본 문서는 Quiet Path의 과거 방향 상세 화면에서 제공할 AI 요약 기능의 1차 설계를 정리한다.
이 문서는 구현 우선순위, 상태값, API 계약, 프론트 전이, QA 기준을 함께 정의하는 기준 문서다.

---

# 1. 목표

## 1.1 사용자 목표
- 사용자는 종료된 방향을 나중에 다시 열어보고, 그 기간의 기록 흐름을 AI 요약으로 확인할 수 있어야 한다.
- 요약은 사용자가 직접 요청했을 때만 생성되어야 한다.
- 기록이 없는 방향에는 억지 요약을 만들지 않아야 한다.

## 1.2 개발 목표
- 기존 `path_summaries` 테이블과 `PathSummary` 엔티티를 최대한 재사용한다.
- 1차에서는 복잡한 인프라 없이 동작해야 한다.
- 2차 확장 시 SSE, websocket, 캐시, 재생성 정책을 붙일 수 있어야 한다.

---

# 2. 1차 범위

## 2.1 포함
- 사용자가 버튼을 눌렀을 때 AI 요약 생성 시작
- 백엔드 비동기 생성 처리
- 생성 상태를 프론트가 polling으로 확인
- 생성 완료 후 과거 방향 상세에 요약 카드 표시
- 실패 시 재시도 가능
- 기록 0개 방향에 대한 별도 상태 처리

## 2.2 제외
- Path 종료 시 자동 요약 생성
- SSE / websocket 실시간 스트리밍
- Redis 캐시 기반 최적화
- 요약 재생성 이력 관리 고도화
- 관리자 프롬프트 관리 UI

---

# 3. 핵심 정책

## 3.1 생성 시점
- AI 요약은 Path 종료 시 자동 생성하지 않는다.
- 사용자가 과거 방향 상세에서 `AI 회고 캡슐 열기`를 눌렀을 때만 생성한다.

## 3.2 생성 가능 조건
- 본인 Path여야 한다.
- Path 상태가 `COMPLETED`여야 한다.
- `reviewAt` 날짜가 지나야 한다.
- 해당 Path에 귀속된 Record가 1개 이상 있어야 한다.

## 3.3 기록 0개 정책
- 기록이 없는 방향은 AI 요약을 생성하지 않는다.
- 이 경우 DB에 `path_summaries` row를 만들지 않는다.
- 화면에는 요약 결과 대신 `요약 생성 불가 안내 카드`를 노출한다.

## 3.4 재생성 정책
- 1차에서는 자동 재생성을 지원하지 않는다.
- 이미 `DONE` 상태 요약이 있으면 기존 요약을 그대로 반환한다.
- `FAILED` 상태일 때만 재시도를 허용한다.

---

# 4. 상태값 설계

## 4.1 내부 상태값 (DB / 비동기 처리 기준)
- 없음: summary row가 아직 없음
- `PENDING`
- `PROCESSING`
- `DONE`
- `FAILED`

내부 상태값은 `path_summaries.status`에 저장한다.

## 4.2 외부 상태값 (API / 화면 기준)
- `LOCKED`
- `EMPTY`
- `READY`
- `PROCESSING`
- `DONE`
- `FAILED`

## 4.3 상태값 매핑

### `LOCKED`
- 조건: `LocalDate.now()`가 `reviewAt`보다 이전
- 내부 row 유무와 무관하게 외부 상태는 `LOCKED`

### `EMPTY`
- 조건: 열람 가능 시점 이후이고, 해당 Path의 Record 수가 0개
- 내부 row는 생성하지 않음

### `READY`
- 조건: 열람 가능 시점 이후이고, Record가 1개 이상이며, summary row가 없음

### `PROCESSING`
- 조건: summary row가 `PENDING` 또는 `PROCESSING`

### `DONE`
- 조건: summary row가 `DONE`

### `FAILED`
- 조건: summary row가 `FAILED`

---

# 5. 사용자 화면 정책

## 5.1 상태별 화면

### `LOCKED`
- 잠금 카드 노출
- 문구: `YYYY.MM.DD 이후에 열어볼 수 있는 회고 캡슐입니다.`

### `EMPTY`
- 생성 버튼 대신 안내 카드 노출
- 문구 예시:
  - 제목: `아직 회고 캡슐을 만들 수 없어요`
  - 설명: `이 방향에는 남겨진 기록이 없어 AI 요약을 생성하지 않았어요. 다음 방향에서는 한 장면만 남겨도 회고 캡슐을 만들 수 있어요.`

### `READY`
- `AI 회고 캡슐 열기` 버튼 노출

### `PROCESSING`
- 버튼 비활성화
- 스피너 + 진행 문구 노출
- 문구 예시: `지난 조각들을 엮는 중...`

### `DONE`
- 요약 카드 노출

### `FAILED`
- 실패 안내 문구 + 재시도 버튼 노출

## 5.2 생성 중 UX
- 1차에서는 전체 화면 로딩을 쓰지 않는다.
- 요약 카드 영역만 상태 전환한다.
- 프론트는 polling으로 상태를 갱신한다.

---

# 6. 백엔드 설계

## 6.1 사용 라이브러리
- OpenAI Java SDK 사용
- 의존성:

```groovy
implementation 'com.openai:openai-java:4.40.0'
```

## 6.2 환경변수
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_SUMMARY_PROMPT_VERSION`
- `OPENAI_SUMMARY_TIMEOUT_MS`

예시:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
OPENAI_SUMMARY_PROMPT_VERSION=v1
OPENAI_SUMMARY_TIMEOUT_MS=45000
```

## 6.3 설정 클래스
- `kr.co.quietpath.api.summary.config.OpenAiProperties`
- `@ConfigurationProperties(prefix = "openai")` 또는 현재 `.env.local` 기준 별도 바인딩 방식 사용

필드 예시:
- `apiKey`
- `model`
- `summaryPromptVersion`
- `summaryTimeoutMs`

## 6.4 클라이언트 추상화
- `AiSummaryClient` 인터페이스
- `OpenAiSummaryClient` 구현체

목적:
- 도메인 서비스가 SDK 구현 상세를 직접 몰라도 되게 분리
- 테스트에서 mock 처리 쉽게 유지
- 추후 provider 변경 또는 HTTP 직접 호출 방식 전환 가능

## 6.5 생성 서비스
- `PathSummaryCommandService`

주요 책임:
- 생성 가능 조건 검증
- 기존 summary 상태 확인
- summary row 생성 또는 재시도 전환
- 비동기 생성 작업 시작

예상 메서드:
- `PathSummaryStartResponse requestSummary(Long userId, Long pathId)`
- `void generateSummaryAsync(Long summaryId)`

## 6.6 조회 서비스
- 기존 `PathService.getPathDetail(...)` 확장

변경 내용:
- `summaryStatus` 계산 로직을 `LOCKED / EMPTY / READY / PROCESSING / DONE / FAILED`로 확장
- `DONE`일 때만 summary payload 포함
- `PROCESSING`, `FAILED`, `EMPTY`일 때는 summary 본문을 포함하지 않음

---

# 7. 비동기 처리 설계

## 7.1 1차 방식
- Spring `@EnableAsync`
- 별도 `TaskExecutor` 등록
- `generateSummaryAsync(...)`에서 OpenAI 호출 수행

## 7.2 상태 전이

### 최초 생성
- row 없음
- `PENDING` 생성
- async 시작 직전 `PROCESSING` 전환

### 성공
- `PROCESSING -> DONE`

### 실패
- `PROCESSING -> FAILED`

## 7.3 고착 상태 처리
- 서버 비정상 종료로 `PROCESSING`이 영구히 남을 수 있다.
- 1차에서는 `updatedAt` 기준 stale 판단 로직을 둔다.
- 예: `PROCESSING` 상태인데 `updatedAt`이 10분 이상 오래되면 `FAILED`로 간주 또는 복구 처리

---

# 8. OpenAI 요청/응답 설계

## 8.1 입력 데이터
- Path 기본 정보
  - directionName
  - directionText
  - categoryCode
  - createdAt
  - completedAt
  - reviewAt
- Path에 귀속된 Record 목록
  - recordDate
  - sceneText
  - oneWordText
  - tomorrowText
  - moodCode

## 8.2 출력 형식
- 1차에서는 구조화된 JSON을 생성하도록 요청한다.
- DB `path_summaries.content`에는 JSON 문자열을 저장한다.

예시:

```json
{
  "headline": "천천히, 그러나 확실하게 나아갔습니다.",
  "body": "흔들리는 순간도 있었지만, 사용자는 기록을 끊지 않고 방향을 따라갔다. 장면 기록과 한 단어 표현에서 감정의 변화가 드러났고, 마지막 기록일수록 다음 걸음이 더 구체적이었다.",
  "observations": [
    "기록 빈도보다 흐름의 지속성이 강하게 보인다.",
    "감정 표현은 흔들렸지만 행동 계획은 점점 선명해졌다."
  ],
  "closing": "다음 방향에서는 흔들린 날의 원인을 한 줄씩 더 남기면 회고의 밀도가 더 올라간다."
}
```

## 8.3 왜 JSON으로 저장하는가
- 프론트 카드 UI를 안정적으로 렌더링할 수 있다.
- 문단/요약/관찰 포인트를 분리해서 재사용하기 쉽다.
- 향후 디자인 변경이나 다국어 대응 때 구조가 유지된다.

---

# 9. API 설계

## 9.1 과거 방향 상세 조회

### Endpoint
`GET /api/v1/paths/{pathId}`

### summaryStatus
- `LOCKED`
- `EMPTY`
- `READY`
- `PROCESSING`
- `DONE`
- `FAILED`

### Response 예시 (`READY`)
```json
{
  "pathId": 14,
  "directionName": "잔잔한 흐름 만들기",
  "directionText": "이번 기간, 나는 너무 흔들리지 않고 움직였는가?",
  "status": "COMPLETED",
  "createdAt": "2026-06-01",
  "reviewAt": "2026-06-08",
  "completedAt": "2026-06-07",
  "summaryStatus": "READY",
  "summary": null,
  "records": [
    {
      "recordId": 201,
      "date": "2026-06-01",
      "preview": "오늘은 서두르지 않고 1개만 끝냈다.",
      "moodText": "잔잔"
    }
  ]
}
```

### Response 예시 (`DONE`)
```json
{
  "pathId": 14,
  "directionName": "잔잔한 흐름 만들기",
  "directionText": "이번 기간, 나는 너무 흔들리지 않고 움직였는가?",
  "status": "COMPLETED",
  "createdAt": "2026-06-01",
  "reviewAt": "2026-06-08",
  "completedAt": "2026-06-07",
  "summaryStatus": "DONE",
  "summary": {
    "headline": "천천히, 그러나 확실하게 나아갔습니다.",
    "body": "흔들리는 순간도 있었지만 기록은 이어졌고, 방향은 점점 또렷해졌습니다.",
    "observations": [
      "기록의 결이 일정하게 유지되었습니다.",
      "마지막으로 갈수록 내일 계획이 더 구체적이었습니다."
    ],
    "closing": "다음 방향에서는 흔들린 날의 이유를 한 줄 더 남겨보세요."
  },
  "records": [
    {
      "recordId": 201,
      "date": "2026-06-01",
      "preview": "오늘은 서두르지 않고 1개만 끝냈다.",
      "moodText": "잔잔"
    }
  ]
}
```

## 9.2 요약 생성 시작

### Endpoint
`POST /api/v1/paths/{pathId}/summary`

### 동작
- `READY` 상태면 생성 시작
- `PROCESSING` 상태면 중복 생성 없이 현재 상태 반환
- `DONE` 상태면 기존 요약 유지 상태 반환
- `FAILED` 상태면 재시도 시작

### Response 예시
```json
{
  "pathId": 14,
  "summaryStatus": "PROCESSING"
}
```

### Error
- `404 PATH_NOT_FOUND`
- `403 NOT_OWNER`
- `409 PATH_SUMMARY_LOCKED`
- `409 PATH_SUMMARY_EMPTY`
- `409 PATH_SUMMARY_NOT_COMPLETED`
- `500 AI_CONFIG_MISSING`
- `500 AI_SUMMARY_REQUEST_FAILED`

---

# 10. 프론트 구현 설계

## 10.1 대상 화면
- `frontend/views/PastDirectionsView.tsx`

현재 상태:
- `setTimeout(1500)` 기반 목업 동작

변경 목표:
- 실 API 연동으로 대체

## 10.2 프론트 전이 흐름

### 상세 화면 진입
- `GET /api/v1/paths/{pathId}` 호출
- `summaryStatus` 기준으로 카드 렌더링

### 생성 버튼 클릭
- `POST /api/v1/paths/{pathId}/summary`
- 응답이 `PROCESSING`이면 polling 시작

### polling
- 2초 간격으로 `GET /api/v1/paths/{pathId}`
- `DONE` 또는 `FAILED`가 되면 polling 중지

## 10.3 프론트에서 처리할 상태
- `LOCKED`
- `EMPTY`
- `READY`
- `PROCESSING`
- `DONE`
- `FAILED`

---

# 11. 구현 순서

## 11.1 백엔드
1. OpenAI properties / config 추가
2. `AiSummaryClient` / `OpenAiSummaryClient` 추가
3. ErrorCode 추가
4. Path summary command service 추가
5. `POST /api/v1/paths/{pathId}/summary` 추가
6. `GET /api/v1/paths/{pathId}` summary 상태 계산 확장
7. 테스트 추가

## 11.2 프론트
1. `pathApi`에 summary start / detail API 추가
2. `PastDirectionsView` 목업 제거
3. 상태별 UI 렌더링 추가
4. polling 로직 추가
5. 실패 / 재시도 UI 추가

---

# 12. QA 기준

## 12.1 잠금
- `reviewAt` 이전에는 항상 `LOCKED`여야 한다.

## 12.2 기록 없음
- 기록 0개 Path는 `EMPTY`여야 한다.
- `POST /summary`를 호출해도 생성되면 안 된다.

## 12.3 첫 생성
- `READY -> PROCESSING -> DONE` 순서로 전이되어야 한다.

## 12.4 중복 클릭
- 버튼 연타 시 summary row가 1개만 생겨야 한다.

## 12.5 실패 복구
- OpenAI 호출 실패 시 `FAILED`가 되어야 한다.
- 재시도 시 다시 `PROCESSING`으로 전환 가능해야 한다.

## 12.6 완료 재조회
- `DONE` 이후 다시 상세 조회하면 기존 summary를 바로 반환해야 한다.

## 12.7 비정상 종료
- `PROCESSING` 상태가 오래 방치되면 stale 처리 기준에 따라 복구되어야 한다.

---

# 13. 2차 확장 후보

- SSE 또는 websocket 기반 실시간 상태 반영
- Redis 캐시 기반 상세 조회 최적화
- 요약 재생성 버튼 및 버전 관리
- prompt version 관리 정책 고도화
- 요약 공개/공유 정책 확장

---

# 14. 결정 요약

- AI 요약은 자동 생성하지 않는다.
- 사용자가 직접 열 때만 생성한다.
- 기록이 없으면 요약을 만들지 않는다.
- 내부 상태와 외부 상태를 분리한다.
- 1차는 polling 기반으로 구현한다.
- OpenAI Java SDK `4.40.0`을 사용한다.
