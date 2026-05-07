# SPEC_COMPACT (Quiet Path Backend)

본 문서는 Quiet Path 백엔드 구현 시 반드시 따라야 하는 공통 규칙이다.
아래 규칙은 예외 없이 적용한다.

---

## 1. 기술 스택 (고정)
- Java 21
- Spring Boot 4.0.2
- Spring WebMVC
- Spring Data JPA
- Spring Security
- Spring Validation
- MySQL 8 (InnoDB)
- Redis (캐시/락/카운트 등 확장 대비)
- Lombok 사용
- Gradle 기반

---

## 2. 로컬 개발 환경 규칙 (Docker 필수)
- 로컬 환경에서 MySQL과 Redis는 반드시 Docker Compose로 구동한다.
- Redis는 현재 캐시/확장 대비 용도로만 연결하며,
  필수 비즈니스 로직에는 의존하지 않는다.
- 백엔드는 로컬에서 실행한다.
- docker-compose.yml은 backend/docker-compose.yml 위치에 둔다.

### Docker Compose 출력 규칙
- docker-compose.yml만 생성한다.
- 설명, 주석, 추가 파일은 생성하지 않는다.


### 2.1 컨테이너 구성
- mysql:8.x
- redis:7.x
- 필요 시 추후 확장(예: redis-replica/sentinel)은 별도 compose로 분리한다.

### 2.2 포트/볼륨/헬스체크
- mysql: host 3306 -> container 3306
- redis: host 6379 -> container 6379
- mysql은 named volume로 데이터 유지
- mysql/redis 모두 healthcheck를 둔다.
- application은 healthcheck 통과 후 연결된다고 가정한다.

### 2.3 환경변수 및 시크릿
- 도커/백엔드 설정값은 .env 또는 application-local.yml로 분리한다.
- 로컬 default:
  - DB: quietpath
  - DB user: quietpath
  - DB pass: quietpath

---

## Application 설정 파일 규칙
- 로컬 개발 환경에서는 application-local.yml을 사용한다.
- DB(MySQL), Redis 접속 정보는 application-local.yml에 정의한다.
- docker-compose로 구동한 컨테이너 기준(host, port)을 사용한다.

### Application 설정 출력 규칙
- application-local.yml만 생성한다.
- 설명, 주석, 추가 파일은 생성하지 않는다.

---

## 3. Spring Profile 규칙
- 기본 프로필: local
- local 프로필에서는 docker로 띄운 mysql/redis에 연결한다.
- 운영은 별도 profile(prod)로 분리한다.

---

## 4. 패키지 구조 규칙 (domain 중심)
도메인 단위로 패키지를 나눈다.

- domain.user
- domain.path
- domain.record
- domain.reaction
- domain.title
- domain.summary

각 domain 내부 구조:
- controller
- service
- repository
- entity
- dto

공통(global):
- global.config
- global.security
- global.exception
- global.response

---

## 5. Controller 규칙
- Controller에는 비즈니스 로직을 두지 않는다.
- 요청/응답 매핑만 담당한다.
- 모든 응답은 ApiResponse<T>로 감싼다.
- Validation(@Valid) 적용.

---

## 6. Service 규칙
- 비즈니스 규칙은 Service에 위치한다.
- 트랜잭션 경계는 Service에 둔다.
- 상태 변경 로직(Path 종료, 공유 처리 등)은 Service 메서드로 제한한다.
- 동시성 정책(하루 1개 기록, 공감 중복 방지 등)을 Service + DB 제약으로 동시에 보장한다.

---

## 7. Entity 규칙
- JPA Entity는 순수 도메인 모델로 유지한다.
- setter 남용 금지 (의미 있는 메서드만 허용)
- created_at/updated_at은 Auditing 또는 수동 처리 중 하나로 통일한다(혼용 금지).


### 7-1. Entity 생성 및 편의 메서드 규칙 (필수)

- 모든 Entity는 의미 없는 기본 생성(new)을 금지한다.
- Entity 생성은 Builder 또는 정적 팩토리 메서드를 통해서만 수행한다.
- 생성 시 필수 값은 Builder 단계에서 반드시 강제한다.
- 상태 변경은 setter가 아닌 **의미 있는 도메인 메서드**로만 수행한다.

### Builder 규칙
- @Builder 사용 가능
- Builder는 생성 전용으로만 사용한다.
- Builder를 통한 생성 시 비즈니스 상태(status, visibility 등)는 명시적으로 설정한다.
- Builder 외 생성 수단(public constructor) 금지

### 편의 메서드 규칙
- Entity는 자신의 상태를 변경하는 도메인 메서드를 반드시 가진다.
- 상태 전이는 반드시 해당 메서드를 통해서만 가능하다.
- 단순 getter/setter 조합으로 상태 변경 금지

### 금지 사항
- public setter를 통한 상태 변경
- Service에서 Entity 필드 직접 수정

### 예시 (Record)
```java
public void share() {
    if (this.visibility == Visibility.PUBLIC) {
        throw new IllegalStateException("이미 공개된 기록입니다.");
    }
    this.visibility = Visibility.PUBLIC;
    this.sharedAt = LocalDateTime.now();
}

```

### 7-2. Entity 생성 방식 표준 (필수)

- Lombok @Builder를 사용할 수 있다.
- 단, 외부에서 builder()를 직접 호출해 생성하는 것을 권장하지 않는다.
- 생성 규칙은 Entity 내부의 정적 팩토리 메서드로 캡슐화한다.

### 생성 규칙
- User 생성은 `User.createKakao(...)` 같은 provider별 정적 팩토리로만 한다.
- 정적 팩토리는 필수값 검증(Objects.requireNonNull)을 포함한다.
- 기본값(level, steps, dataSyncEnabled, createdAt/updatedAt)은 생성 과정에서 단일 위치에서 설정한다.

### 시간 갱신 규칙
- updatedAt 갱신은 `touch()` 메서드로 통일한다.
- 도메인 메서드에서 updatedAt을 직접 설정하는 코드 반복을 금지한다.


### 7-3. Entity 입력값 검증 규칙 (필수)

- Entity 도메인 메서드는 상태를 깨뜨릴 수 있는 입력을 반드시 검증한다.
- null, blank, 음수, 불가능한 상태 전이는 Entity에서 차단한다.
- 형식(regex), 길이, 국제화 메시지는 Entity 책임이 아니다.

---

## 8. Repository 규칙
- Spring Data JPA 사용
- 복잡한 조회는 Query Method 또는 JPQL 사용
- Repository에 비즈니스 로직 금지

---

## 9. 날짜/시간 규칙
- record_date는 LocalDate (KST 기준)
- created_at, updated_at은 LocalDateTime
- 하루 1개 기록 정책은:
  - records unique(user_id, record_date)
  - Service에서 upsert 방식으로 처리

---

## 10. 정책(비즈니스 룰) 강제 (확정)
- User는 동시에 ACTIVE Path를 1개만 가진다.
  - users.current_path_id 로 강제한다.
- Record는 하루 1개만 존재한다.
  - records unique(user_id, record_date)
- Record는 작성 후 공유 버튼으로만 PUBLIC 전환된다.
  - share action: visibility=PUBLIC, shared_at=now
- 공감은 PUBLIC Record에만 가능하다.
- 칭호는 획득형이며 titles + user_titles + users.current_title_id로 관리한다.

---

## 인증/회원 정책 (고정)
- 로그인/회원가입 Provider는 현재 KAKAO만 지원한다.
- ProviderType enum에는 KAKAO만 정의한다.
- Google 로그인은 추후 추가 예정 (ProviderType 확장 구조로 대비되어 있음).
- Apple 등 그 외 provider 관련 코드는 생성/추가 금지.
- 추후 provider 추가는 요구사항 변경 시에만 진행한다.

---

## 11. 예외 처리 규칙
- 모든 예외는 RuntimeException 기반 커스텀 예외 사용
- GlobalExceptionHandler에서 일괄 처리
- 비즈니스 위반은 CustomException으로 통일(에러 코드 포함)

---

## 12. 네이밍 규칙
- 엔티티: 단수형 (User, Path, Record)
- 테이블: 복수형
- DTO: XxxRequest / XxxResponse
- status, code 값은 문자열 code 기반으로 관리한다.

---

## 13. 코드 스타일 규칙 (필수)

- Java 코드 포맷은 가독성을 최우선으로 한다.
- 한 줄에 여러 메서드 선언을 나열하지 않는다.
- Repository / Service / Controller 메서드는 반드시 줄바꿈하여 선언한다.
- 메서드 시그니처가 길 경우 파라미터를 줄바꿈하여 정렬한다.
- 메서드 선언은 한 줄에 하나만 작성한다.
- 의미 없는 축약, 한 줄 몰아쓰기 금지.

예시 (Repository):
```java
Optional<User> findByProviderAndProviderUserId(
    String provider,
    String providerUserId
);

Optional<User> findByNickname(String nickname);

boolean existsByNickname(String nickname);
