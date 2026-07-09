# Refresh Token 세션 복구 이슈 정리 (2026-07-08)

## 1. 목적

다음 AI 세션이 아래 이슈를 바로 이어서 볼 수 있게 현재까지 확인한 사실, 배제한 원인, 남은 가설, 다음 작업 순서를 정리한다.

이 문서는 **기록 탭 고정하기 버튼에서 드러난 세션 복구 실패 문제**를 다룬다.

---

## 2. 현재 증상

### 사용자 체감 증상

* 기록 탭에서 `고정하기` 클릭 시 아래 문구가 떴다.

  * `고정 상태를 바꾸지 못했어요`
  * `세션이 만료되었습니다. 다시 로그인해 주세요.`

### 재현 당시 조건

* 사용자 설명 기준:

  * **같은 창에서만 사용**
  * **Docker / Redis는 계속 켜져 있었음**
* 따라서 “멀티탭 경쟁”이나 “로컬 Redis 재시작”은 **1차 원인 후보에서 밀린 상태**다.

---

## 3. 우선 판단

### 급한 정도

* 지금 당장 모든 기능 작업을 멈추고 핫픽스로 처리할 급은 아님
* 하지만 **출시 전에는 반드시 정리해야 하는 인증 UX 이슈**다

### 이유

* 서버 장애나 데이터 손상 문제는 아님
* 그러나 사용자는 기능 실행 중 갑자기 로그인이 끊긴 것으로 느낀다
* 같은 창만 썼는데도 refresh 복구가 실패했다면 운영에서도 재현될 수 있다

---

## 4. 현재 코드 기준 확인된 사실

### 4-1. 고정하기 API만 예외인 구조는 아님

`recordApi.updatePin()`은 공통 `apiFetch()` 경로를 탄다.

* `frontend/api/recordApi.ts`
* `frontend/api/apiClient.ts`

즉 고정하기만 토큰 확인/재발급 로직이 빠진 것은 아니다.

### 4-2. 공통 자동 refresh는 이미 연결되어 있음

`apiFetch()`는 인증이 필요한 요청에서 `401`이 나오면 refresh handler로 1회 재시도한다.

관련 파일:

* `frontend/api/apiClient.ts`
* `frontend/App.tsx`

### 4-3. access token / refresh token TTL

로컬 설정 기준:

* access token TTL: `3600초` = 1시간
* refresh token TTL: `15552000초` = 180일

관련 파일:

* `backend/src/main/resources/application-local.yml`

### 4-4. refresh token은 회전(single-use rotation) 구조임

`/auth/refresh` 성공 시 서버는 새 refresh token을 발급하고, Redis 세션의 `tokenHash`를 새 값으로 바꾼다.

즉:

* “180일”은 **최신 refresh token 기준 최대 수명**
* 예전에 받은 refresh token이 180일 동안 계속 유효하다는 뜻은 아님

관련 파일:

* `backend/src/main/java/kr/co/quietpath/api/auth/service/AuthService.java`
* `backend/src/main/java/kr/co/quietpath/domain/auth/entity/RefreshTokenSession.java`

### 4-5. 같은 탭 내부에서는 refresh 중복을 어느 정도 막고 있음

`refreshAuthRequestRef`로 같은 탭 내부의 동시 refresh는 single-flight로 묶고 있다.

관련 파일:

* `frontend/App.tsx`

즉 이번 이슈는 “같은 탭에서 refresh가 동시에 두 번 돌아서 꼬였다” 하나만으로 설명되지는 않는다.

### 4-6. 프론트 저장 타이밍은 아직 약한 편임

refresh 성공 후 최신 토큰은 아래 순서로 갱신된다.

1. `authSessionRef.current` 갱신
2. `setState(...)` 갱신
3. 이후 `useEffect(() => saveState(state))`에서 `localStorage` 저장

즉 refresh 성공 직후 **즉시 localStorage를 직접 갱신하는 구조는 아직 아니다**.

관련 파일:

* `frontend/App.tsx`
* `frontend/storage.ts`

---

## 5. 현재까지 배제한 오해

### 5-1. “고정하기 API만 토큰 로직이 빠져 있음”

아님.

고정하기도 `apiFetch + auto refresh` 경로를 탄다.

### 5-2. “refresh token TTL이 180일이니 무효될 리 없음”

아님.

현재 구조는 **최신 refresh token만 유효**하다.
회전 이후 이전 refresh token은 TTL이 남아 있어도 바로 invalid다.

### 5-3. “이번 건은 멀티탭 경쟁 문제로 확정”

아님.

사용자 설명이 같은 창 기준이라 멀티탭은 우선순위가 낮다.

### 5-4. “로컬 Redis 재시작 때문으로 확정”

아님.

이전에는 유력 가설이었지만, 현재 사용자 설명상 Docker는 계속 켜져 있었다.

---

## 6. 현재 가장 현실적인 해석

이번 401은 “고정 기능 에러”가 아니라 아래 흐름으로 보는 것이 맞다.

1. 고정 요청 시점에 access token이 이미 만료됨
2. 프론트가 auto refresh를 시도함
3. refresh가 실패함
4. 원요청도 최종적으로 401로 끝남

즉 문제의 핵심은:

* `pin API`가 아니라
* **refresh 복구 실패의 실제 원인**이다

---

## 7. 남은 주요 가설

### 가설 A. 최신 refresh token이 localStorage에 즉시 반영되지 않아, 앱 재마운트/새로고침/HMR 시 예전 토큰으로 복구됨

가능성 있음.

같은 창만 사용했더라도 아래는 여전히 가능하다.

* 개발 중 HMR
* 페이지 새로고침
* 앱 재마운트
* 예외 상황 후 상태 복구

현재는 refresh 성공 시 `state` 저장 effect에 의존하므로, 저장 타이밍이 약하다.

### 가설 B. 서버 쪽 Redis 세션과 브라우저가 가진 refresh token이 이미 어긋난 상태

가능성 있음.

이 경우 같은 창이어도 refresh는 실패한다.
이건 실제 `/auth/refresh` 응답 코드와 서버 로그를 봐야 확정 가능하다.

### 가설 C. 같은 창 내부의 동시 요청으로 refresh가 꼬임

가능성은 낮지만 완전 배제는 아직 못 했다.

다만 현재 single-flight 구조가 있어 최우선 가설은 아니다.

---

## 8. 이번 대화 중 이미 반영된 UX 완화

고정/공유 변경에서 `401`이 나면 애매한 모달만 띄우지 않고 로그인 흐름으로 넘기도록 프론트가 보완되었다.

관련 파일:

* `frontend/components/records/RecordsListTab.tsx`

주의:

* 이 변경은 **원인 해결이 아니라 UX 완화**다.
* 근본 원인은 여전히 남아 있다.

---

## 9. 다음 AI 세션 권장 작업 순서

### 1단계. 실제 refresh 실패 지점부터 확정

아래 순서로 확인:

1. `고정하기` 클릭
2. 네트워크 탭에서
   * `/api/v1/records/{id}/pin`
   * `/api/v1/auth/refresh`
   두 요청 순서를 확인
3. `/auth/refresh`의 실제 status를 확인

확인해야 할 질문:

* refresh 요청이 실제로 나가는가?
* 나간다면 `200`인가, `400/401`인가?
* body message는 무엇인가?

### 2단계. 프론트가 refresh 성공 후 최신 토큰을 어디까지 유지하는지 확인

확인 포인트:

* `authSessionRef.current.refreshToken`
* `state.auth.refreshToken`
* `localStorage['quiet_path_data_v1'].auth.refreshToken`

특히 refresh 직후 위 3개 값이 모두 같은지 본다.

### 3단계. 프론트 보완 우선 적용

가벼운 우선 보완:

* refresh 성공 직후 `localStorage`도 즉시 갱신
* 저장을 `useEffect(saveState)`에만 맡기지 않도록 보완

이건 원인 확정 전에도 안전한 개선이다.

### 4단계. 필요 시 서버 로그 보강

`/auth/refresh` 실패 시 아래를 로그로 구분해 남기면 디버깅이 쉬워진다.

* lock 획득 실패
* `findByTokenHash(...)` 미조회
* 기타 예외

현재는 모두 `REFRESH_TOKEN_INVALID`로 뭉개져 원인 분리가 어렵다.

### 5단계. 그 이후에만 추가 설계 검토

아래는 **원인 확정 후** 검토:

* 이전 refresh token grace window
* 멀티탭 동기화
* 세션 진단용 운영 로그 확장

현재 단계에서는 바로 grace window부터 넣기보다, 먼저 실제 실패 원인을 확인하는 편이 낫다.

---

## 10. 다음 세션이 바로 열어볼 파일

### 프론트

* `frontend/App.tsx`
  * refresh handler
  * auth state / saveState 흐름
* `frontend/api/apiClient.ts`
  * `401 -> refresh -> retry`
* `frontend/api/authApi.ts`
  * `/auth/refresh`
* `frontend/components/records/RecordsListTab.tsx`
  * 고정하기 액션
* `frontend/storage.ts`
  * `quiet_path_data_v1` 저장 구조

### 백엔드

* `backend/src/main/java/kr/co/quietpath/api/auth/service/AuthService.java`
  * refresh rotation
* `backend/src/main/java/kr/co/quietpath/domain/auth/entity/RefreshTokenSession.java`
  * TTL / rotate
* `backend/src/main/resources/application-local.yml`
  * JWT TTL 설정

---

## 11. 결론

현재 판단 기준으로 이 이슈는:

* **즉시 서비스 중단 급은 아님**
* 하지만 **배포 전에는 반드시 해결해야 할 인증 복구 이슈**다

핵심은 `고정하기`가 아니라 **refresh token 최신본 유지 / 복구 실패 원인 확정**이다.
