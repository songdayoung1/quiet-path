# Record 도메인 불변식 (Invariants)

> 목적: Record 도메인의 핵심 규칙을 **API 계약 → 서비스 로직 → DB 제약** 레이어로 나누어 강제하고, 실패/동시성 상황에서도 일관되게 동작하도록 설계한다.

---

## 0. 공통 원칙

* **recordDate는 서버가 결정한다.**

  * 기준 타임존: `Asia/Seoul`
  * 클라이언트 입력으로 recordDate를 받지 않는다.
* **동시성 최종 방어선은 DB 제약(Unique)이다.**

  * 애플리케이션의 `exists` 체크는 UX(명확한 에러 메시지)와 불필요한 write 감소용이다.
* 에러는 **도메인 의미**로 표준화한다.

  * 예: `409 CONFLICT` + 명확한 에러코드

---

## 1. 불변식 #1 — 하루 1개 Record

### 규칙

* 동일 사용자(`userId`)는 동일 날짜(`recordDate`)에 **Record를 1개만 생성**할 수 있다.

### 의도(왜 필요한가)

* “오늘의 기록”이라는 기능 의미를 보장한다.
* 중복 Record로 인해 피드/집계/랭킹 등 파생 데이터가 왜곡되는 것을 방지한다.

### 강제 레이어

#### (1) API 계약

* `RecordCreateRequest`에는 `recordDate` 필드를 포함하지 않는다.
* `userId`를 Path/Body로 받지 않는다(인증 컨텍스트에서만 획득).

#### (2) 서비스 로직 (1차 방어: UX)

* `existsByUserIdAndRecordDate(userId, recordDate)`로 **사전 존재 체크**를 수행한다.
* 이미 존재하면 즉시 실패 처리한다.

#### (3) DB 제약 (최종 방어: 동시성 포함)

* `(user_id, record_date)`에 **UNIQUE 제약**을 둔다.
* insert 시 Unique 충돌이 발생하면 도메인 에러로 변환한다.

### 실패 응답 표준

* HTTP: `409 CONFLICT`
* ErrorCode: `RECORD_ALREADY_EXISTS`
* 메시지 예: `오늘의 기록은 이미 존재합니다.`

### 동시성 시나리오

* 더블클릭/재시도/모바일 웹뷰 중복 호출로 동일 요청이 거의 동시에 2번 들어오는 경우
* 2개 서버 인스턴스에서 동시에 처리되는 경우

**기대 동작**

* 하나는 성공(예: `201 CREATED`)
* 나머지는 DB UNIQUE 충돌 → `RECORD_ALREADY_EXISTS(409)`로 정규화

### 관측/로그 포인트(권장)

* `userId`, `recordDate`, `requestId` 기반으로 중복 생성 시도를 로깅
* `RECORD_ALREADY_EXISTS` 발생 빈도(지표) 확인

---

## 2. 불변식 #2 — Active Path가 없으면 Record 생성 불가

### 규칙

* 사용자는 **Active Path가 존재할 때만** Record를 생성할 수 있다.

### 의도(왜 필요한가)

* Record는 “현재 진행 중인 방향/목표(Path)”에 귀속되는 데이터다.
* Path 없이 Record가 생성되면 조회/피드/집계에서 데이터가 떠돌며 도메인 의미가 깨진다.

### 강제 레이어

#### (1) API 계약

* Record 생성 요청은 Path 정보를 직접 받지 않는다.

  * Path는 서버가 `userId` 기준으로 Active Path를 찾아 연결한다.

#### (2) 서비스 로직 (주 방어)

* `findActivePathByUserId(userId)` 조회
* 없으면 즉시 도메인 에러로 실패 처리

#### (3) DB 제약 (보조)

* `record.path_id` FK로 정합성 확보
* (선택) Path 상태 컬럼(`status`)이 있다면, Active 상태의 Path만 연결되도록 서비스에서 보장

### 실패 응답 표준

* HTTP: `409 CONFLICT`
* ErrorCode: `ACTIVE_PATH_NOT_FOUND`
* 메시지 예: `진행 중인 Path가 없어 기록을 생성할 수 없습니다.`

### 경계/경합 시나리오(선택 문서화)

* Path 종료 처리와 Record 생성 요청이 거의 동시에 발생

  * 트랜잭션 내 Active Path 조회 시점 기준으로 처리
  * (선택) Path 종료 시점에 대한 정책(예: 종료 후에는 생성 불가)을 명확히 문서화

---

## 3. 불변식 #3 — recordDate 서버 결정 (정책/규칙)

### 규칙

* recordDate는 서버가 `Asia/Seoul` 기준으로만 결정한다.

### 의도

* 클라이언트 시간/타임존/조작 가능성으로부터 도메인 규칙을 보호한다.
* “하루 1개” 규칙의 기준을 명확히 한다.

### 강제 레이어

* API 계약: request에 recordDate를 받지 않는다.
* 서비스: `LocalDate.now(ZoneId.of("Asia/Seoul"))`로 계산한다.

---

## 4. 구현 체크리스트 (Codex와 대화할 때 확인할 것)

> 목표: “문서에 적힌 불변식”이 **코드/DB/응답 규격**으로 실제 강제되는지 체크한다.

### 4-1) API 계약(Controller/Request DTO)

* [ ] `POST /records` (또는 동일 역할의 엔드포인트)에서 **recordDate를 입력받지 않는다.**

  * Request DTO에 `recordDate` 필드가 존재하지 않아야 함
  * Query/Path로도 recordDate를 받지 않도록 설계
* [ ] `userId`를 Path/Body로 받지 않는다.

  * 인증 컨텍스트(예: `Principal`, `@AuthenticationPrincipal`)에서만 userId 추출
* [ ] 입력 검증(Validation)

  * [ ] 본문 내용 길이/필수값 등 Bean Validation 적용
  * [ ] validation 실패는 `400 BAD_REQUEST`로 일관되게 응답

### 4-2) 도메인/서비스 로직(불변식 강제 흐름)

* [ ] 서버 기준 recordDate 계산

  * [ ] `LocalDate.now(ZoneId.of("Asia/Seoul"))` 또는 동일 정책으로 계산
* [ ] Active Path 확인

  * [ ] `findActivePathByUserId(userId)` 수행
  * [ ] 없으면 `ACTIVE_PATH_NOT_FOUND`로 실패
* [ ] (선택) 사전 존재 체크(UX/불필요한 write 감소)

  * [ ] `existsByUserIdAndRecordDate(userId, recordDate)`
  * [ ] true면 `RECORD_ALREADY_EXISTS`로 실패
* [ ] Record 생성 시 Path 연결 방식 확정

  * [ ] Record가 `pathId`(FK)로 Active Path를 참조
  * [ ] Path 상태가 ACTIVE인지 재확인(필요 시)

### 4-3) 트랜잭션 범위/정합성

* [ ] Record 생성 서비스 메서드에 트랜잭션 적용

  * [ ] insert까지 하나의 트랜잭션으로 묶고, 예외 시 롤백
  * [ ] read-only 트랜잭션과 write 트랜잭션 분리 정책이 있다면 문서화

### 4-4) DB 제약(최종 방어선)

* [ ] UNIQUE 제약 추가: `(user_id, record_date)`

  * [ ] 인덱스/제약 이름 명시(운영/디버깅 편의)
* [ ] FK 제약 확인: `record.path_id -> path.id`

  * [ ] path 삭제/상태 전이 정책에 맞는 ON DELETE 전략 점검

### 4-5) 예외 처리 & 응답 표준화(면접에서 제일 잘 먹힘)

* [ ] DB UNIQUE 충돌 예외를 `RECORD_ALREADY_EXISTS(409)`로 변환

  * [ ] `DataIntegrityViolationException` / `ConstraintViolationException` 등 매핑
* [ ] 도메인 예외를 HTTP로 정규화

  * [ ] `ACTIVE_PATH_NOT_FOUND` -> 409
  * [ ] `RECORD_ALREADY_EXISTS` -> 409
  * [ ] validation 오류 -> 400
  * [ ] 인증 없음/만료 -> 401
  * [ ] 권한 없음 -> 403
* [ ] 응답 바디 규격 통일

  * [ ] `errorCode`, `message`, `timestamp`, `path`(선택), `requestId`(선택)

### 4-6) 동시성 시나리오 검증(최소 1개는 증거를 남길 것)

* [ ] “동일 유저 + 동일 날짜 + 동시 2요청”에서 결과가

  * [ ] 하나는 201
  * [ ] 하나는 409(`RECORD_ALREADY_EXISTS`)로 귀결되는지 확인
* [ ] (선택) 멀티 인스턴스 가정 설명 준비

  * [ ] 애플리케이션 레벨 exists 체크는 레이스가 가능하므로 최종 방어는 DB라는 설명

### 4-7) 테스트(코드가 없더라도 설계는 있어야 함)

* [ ] 단위 테스트(도메인/서비스)

  * [ ] Active Path 없을 때 409
  * [ ] 이미 존재할 때 409
* [ ] 통합 테스트(DB 포함)

  * [ ] UNIQUE 충돌을 실제로 재현하고 409로 매핑되는지
* [ ] 동시성 테스트(선택)

  * [ ] 2스레드/동시 호출로 201/409 분기 확인

### 4-8) 관측성(운영/디버깅 포인트)

* [ ] 중복 생성(409) 발생 시 로그에 `userId`, `recordDate`, `requestId` 남김
* [ ] 주요 에러코드별 카운트 지표(선택) 또는 최소한 로그 기반 집계 가능

### 4-9) 문서/스펙 동기화

* [ ] 본 문서(불변식 MD)와 API MD, 에러코드 목록이 일치
* [ ] 코덱스 프롬프트에 위 체크리스트 항목이 그대로 반영되어 있음
