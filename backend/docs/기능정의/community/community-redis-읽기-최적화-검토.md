# Community Redis 읽기 최적화 검토

## 1. 결론

지금 제안한 방향은 전체적으로 맞다.

우선순위도 적절하다.

1. `weekly-top3` 캐시
2. `comments` 캐시
3. `feed`는 이번 단계 제외

다만 실제 구현 전에 아래 4가지는 문서로 못 박아야 한다.

* `weeklyTop3`는 공용 캐시와 사용자별 `isReacted`를 분리한다.
* 댓글 변경은 `comments`뿐 아니라 `weekly-top3`도 같이 무효화한다.
* `comments` 캐시 키에는 `page`만 아니라 `size`도 포함한다.
* 캐시 무효화는 가능하면 트랜잭션 커밋 이후에 반영한다.

---

## 2. Step별 검토

### Step 1. CacheConfig

방향은 맞다.

필수 설정은 아래 정도면 충분하다.

* `RedisCacheManager` 등록
* key serializer: `StringRedisSerializer`
* value serializer: `GenericJackson2JsonRedisSerializer`
* 캐시별 TTL 분리
  * `weekly-top3`: 5분
  * `comments`: 2분

추가로 문서에 넣어야 할 점:

* `null` 응답은 캐시하지 않는다.
* 직렬화 대상에 `LocalDateTime`이 있으면 Jackson time 설정이 필요할 수 있다.
* 캐시 이름은 고정 문자열로 관리한다.
  * 예: `weekly-top3`, `comments`

---

### Step 2. WeeklyTop3 캐시

이 방향도 맞다.

다만 `FeedService.getWeeklyTop3()` 전체를 그대로 캐시하면 `isReacted` 때문에 사용자별 응답이 섞일 수 있다.

그래서 구조를 아래처럼 나누는 편이 안전하다.

* `getWeeklyTop3Base()`
  * 공용 데이터만 조회
  * `@Cacheable("weekly-top3")`
  * 포함 값: `recordId`, `title`, `content`, `owner`, `categoryCode`, `reactionCount`, `commentCount`, `sharedAt`, `createdAt`
  * 제외 값: `isReacted`
* `getWeeklyTop3(userId)`
  * `getWeeklyTop3Base()` 결과를 가져온다.
  * `reactionRepository.findReactedRecordIds(userId, recordIds)`로 사용자별 `isReacted`만 overlay 한다.

즉 캐시 대상은 "공용 Top3 본문"이고, 사용자별 좋아요 여부는 캐시 밖에서 붙인다.

### WeeklyTop3 무효화 규칙

문서에 아래까지 포함해야 한다.

무효화 트리거:

* `ReactionService.createReaction()`
* `ReactionService.deleteReaction()`
* `CommentService.createComment()`
* `CommentService.deleteComment()`

이유:

* Top3 정렬 기준은 최근 7일 공감 수다.
* Top3 카드에 보여주는 값은 총 `reactionCount`, `commentCount`다.
* 따라서 댓글 수가 바뀌면 순위는 안 바뀌어도 카드 숫자는 바뀐다.

반대로 `updateComment()`는 내용만 바뀌므로 `weekly-top3` 무효화 대상이 아니다.

---

### Step 3. Comments 캐시

이 방향도 맞다.

다만 캐시 키는 아래처럼 잡는 편이 낫다.

* `comments:{recordId}:{page}:{size}`

즉 `page`만 아니라 `size`도 포함해야 한다.

현재 구조상 댓글 목록은 사용자별 값이 섞이지 않는다.

이유:

* soft delete 댓글은 일반 조회에서 제외된다.
* 수정/삭제 버튼 노출 여부는 프론트가 `comment.userId === auth.userId`로 판단한다.
* 서버가 댓글 목록을 사용자별로 다르게 내려주지 않는다.

그래서 `recordId + page + size` 단위 공용 캐시로 충분하다.

### Comments 무효화 규칙

`@CacheEvict`만으로는 `comments:{recordId}:*` 패턴 삭제가 안 되므로, `RedisTemplate`으로 record 단위 전체 페이지를 지우는 방식이 맞다.

무효화 트리거:

* `createComment()`
* `updateComment()`
* `deleteComment()`

이유:

* 생성/삭제는 페이지 구성과 `totalElements`가 바뀐다.
* 수정은 count는 그대로지만 댓글 내용이 바뀐다.
* 수정된 댓글이 어느 페이지에 있는지 서비스 계층에서 바로 알기 어렵다.

따라서 "해당 record의 comments 캐시 전체 페이지 삭제"가 MVP 기준 가장 단순하고 안전하다.

---

### Step 4. Feed 캐시 제외

이 판단도 맞다.

다만 문구는 조금 더 정확하게 적는 편이 좋다.

정리 문구:

* `feed`는 cursor 기반 페이지네이션이라 캐시 키 조합이 빠르게 늘어난다.
* 새 공유, 공감, 댓글에 따라 어떤 페이지가 영향을 받는지 특정하기 어렵다.
* 사용자별 `isReacted`까지 포함하면 공용 캐시 효율이 더 떨어진다.
* 그래서 이번 단계에서는 Redis 캐시 대상에서 제외하고, 쿼리 최적화와 인덱스로 대응한다.

즉 "캐시를 못 한다"가 아니라 "MVP 기준 대비 효율이 낮아서 우선순위에서 제외"가 정확하다.

---

## 3. 구현 시 빠지기 쉬운 포인트

### 1. `weeklyTop3`는 댓글 변경에도 무효화해야 한다

반응만 보고 eviction을 걸면 Top3 카드의 `commentCount`가 stale 상태로 남는다.

### 2. `comments` 캐시 키에는 `size`가 필요하다

`page`만 쓰면 다른 page size 요청이 같은 키를 덮어쓸 수 있다.

### 3. 캐시 무효화 시점은 커밋 이후가 더 안전하다

이상적인 방식:

* 서비스에서 변경 성공
* 트랜잭션 커밋 완료
* 그 다음 Redis eviction 실행

이유:

* 롤백된 변경 때문에 캐시만 먼저 날아가면 짧은 stale/불필요 miss 구간이 생길 수 있다.

MVP에서는 바로 `@CacheEvict`로 시작해도 되지만, 정합성을 더 챙기려면 `@TransactionalEventListener(AFTER_COMMIT)` 방식이 더 안전하다.

### 4. `weeklyTop3` 캐시는 "base payload"만 저장한다

사용자별 `isReacted`를 같이 캐시하면 로그인 사용자 응답이 서로 오염될 수 있다.

---

## 4. 추천 구현안

### 4.1 캐시 이름

* `weekly-top3`
* `comments`

### 4.2 WeeklyTop3

* `FeedService.getWeeklyTop3Base()`에 `@Cacheable("weekly-top3")`
* `FeedService.getWeeklyTop3(userId)`는 base 조회 후 `isReacted`만 overlay
* 반응 생성/삭제 시 `weekly-top3` eviction
* 댓글 생성/삭제 시 `weekly-top3` eviction

### 4.3 Comments

* `CommentService.getComments(query)` 캐시 키
  * `comments:{recordId}:{page}:{size}`
* 댓글 생성/수정/삭제 시 `comments:{recordId}:*` 전체 삭제

### 4.4 Feed

* Redis 캐시 미적용
* 인덱스/쿼리 개선 우선

---

## 5. 블로그용 한 줄 정리

이번 커뮤니티 읽기 최적화는 "모든 조회를 캐시"하는 접근이 아니라, 정합성 비용이 낮고 재사용성이 높은 `weeklyTop3`와 `comments`만 Redis에 올리고, `feed`는 cursor 기반 특성상 캐시 효율이 낮아 쿼리 최적화 대상으로 남기는 방향이 적절하다.
