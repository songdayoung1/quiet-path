SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @seed_user_count = 400;
SET @seed_record_days = 50;
SET @burst_comment_count = 160;

DELETE c
FROM comments c
JOIN users u ON u.id = c.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE c
FROM comments c
JOIN records r ON r.id = c.record_id
JOIN users u ON u.id = r.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE rct
FROM reactions rct
JOIN users u ON u.id = rct.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE rct
FROM reactions rct
JOIN records r ON r.id = rct.record_id
JOIN users u ON u.id = r.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE ps
FROM path_summaries ps
JOIN paths p ON p.id = ps.path_id
JOIN users u ON u.id = p.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE rt
FROM refresh_tokens rt
JOIN users u ON u.id = rt.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE n
FROM notifications n
JOIN users u ON u.id = n.recipient_user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE n
FROM notifications n
JOIN users u ON u.id = n.actor_user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

UPDATE paths p
JOIN users u ON u.id = p.user_id
SET p.cover_record_id = NULL
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE r
FROM records r
JOIN users u ON u.id = r.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE p
FROM paths p
JOIN users u ON u.id = p.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

DELETE u
FROM users u
WHERE u.provider_user_id LIKE 'seed-community-%';

INSERT INTO users (
    provider,
    provider_user_id,
    email,
    nickname,
    current_title_id,
    level,
    steps_taken,
    data_sync_enabled,
    created_at,
    updated_at,
    last_login_at
)
WITH RECURSIVE user_seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM user_seq WHERE n < @seed_user_count
)
SELECT
    'KAKAO',
    CONCAT('seed-community-', LPAD(n, 3, '0')),
    CONCAT('seed-community-', LPAD(n, 3, '0'), '@quietpath.local'),
    CASE MOD(n - 1, 5)
        WHEN 0 THEN CONCAT('고요한취업', LPAD(n, 3, '0'))
        WHEN 1 THEN CONCAT('잔잔한공부', LPAD(n, 3, '0'))
        WHEN 2 THEN CONCAT('꾸준한건강', LPAD(n, 3, '0'))
        WHEN 3 THEN CONCAT('느린취미', LPAD(n, 3, '0'))
        ELSE CONCAT('차분한자격증', LPAD(n, 3, '0'))
    END,
    NULL,
    1,
    0,
    1,
    NOW() - INTERVAL (50 + n) DAY,
    NOW() - INTERVAL MOD(n, 7) DAY,
    NOW() - INTERVAL MOD(n, 5) DAY
FROM user_seq;

INSERT INTO paths (
    user_id,
    category_code,
    direction_name,
    direction_text,
    review_at,
    cover_record_id,
    status,
    completed_at,
    created_at,
    updated_at
)
WITH RECURSIVE user_seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM user_seq WHERE n < @seed_user_count
)
SELECT
    u.id,
    CASE MOD(s.n - 1, 5)
        WHEN 0 THEN 'job'
        WHEN 1 THEN 'study'
        WHEN 2 THEN 'workout'
        WHEN 3 THEN 'hobby'
        ELSE 'cert'
    END,
    CASE MOD(s.n - 1, 5)
        WHEN 0 THEN '취업 준비의 리듬을 지키기'
        WHEN 1 THEN '배움의 페이스를 조용히 유지하기'
        WHEN 2 THEN '무리하지 않고 몸과 컨디션 돌보기'
        WHEN 3 THEN '일상 안에서 취미 시간을 지키기'
        ELSE '시험 준비의 호흡을 꾸준히 이어가기'
    END,
    CASE MOD(s.n - 1, 5)
        WHEN 0 THEN '오늘도 한 걸음 가고 있는가?'
        WHEN 1 THEN '나만의 속도로 배우고 있는가?'
        WHEN 2 THEN '몸과 컨디션을 살피고 있는가?'
        WHEN 3 THEN '충분히 쉬며 좋아하는 것을 하고 있는가?'
        ELSE '합격까지의 리듬을 지키고 있는가?'
    END,
    TIMESTAMP(CURDATE() + INTERVAL (5 + MOD(s.n, 6)) DAY, '21:00:00'),
    NULL,
    'COMPLETED',
    NOW() - INTERVAL MOD(s.n, 6) DAY,
    NOW() - INTERVAL (50 + s.n) DAY,
    NOW() - INTERVAL MOD(s.n, 6) DAY
FROM user_seq s
JOIN users u
  ON u.provider = 'KAKAO'
 AND u.provider_user_id = CONCAT('seed-community-', LPAD(s.n, 3, '0'));

INSERT INTO records (
    user_id,
    path_id,
    category_code,
    record_date,
    scene_text,
    one_word_text,
    tomorrow_text,
    mood_code,
    image_url,
    is_hidden,
    pinned_at,
    visibility,
    shared_at,
    share_code,
    reaction_count,
    created_at,
    updated_at
)
WITH RECURSIVE user_seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM user_seq WHERE n < @seed_user_count
),
day_seq AS (
    SELECT 1 AS d
    UNION ALL
    SELECT d + 1 FROM day_seq WHERE d < @seed_record_days
)
SELECT
    u.id,
    p.id,
    p.category_code,
    CURDATE() - INTERVAL (ds.d + MOD(us.n, 4)) DAY,
    CASE p.category_code
        WHEN 'job' THEN CONCAT('지원서 문장을 다듬고 면접 질문을 정리했다. 오늘은 ', ds.d, '번째 체크포인트만 조용히 마무리했다.')
        WHEN 'study' THEN CONCAT('공부 시간을 길게 늘리기보다 핵심 개념을 다시 정리했다. 오늘은 ', ds.d, '개의 메모를 남겼다.')
        WHEN 'workout' THEN CONCAT('운동 강도를 무리하게 올리지 않고 호흡과 자세에 집중했다. 몸의 상태를 확인하며 ', ds.d, '세트만 채웠다.')
        WHEN 'hobby' THEN CONCAT('좋아하는 일을 잠깐이라도 붙잡았다. 결과보다 몰입감을 챙기며 ', ds.d, '번째 작은 즐거움을 기록했다.')
        ELSE CONCAT('시험 범위를 잘게 나누고 오답을 다시 확인했다. 오늘은 ', ds.d, '개의 개념을 점검했다.')
    END,
    CASE p.category_code
        WHEN 'job' THEN ELT(MOD(ds.d - 1, 6) + 1, '서류 다듬기', '질문 정리', '답변 점검', '마음 추스르기', '한 칸 전진', '호흡 유지')
        WHEN 'study' THEN ELT(MOD(ds.d - 1, 6) + 1, '집중', '정리', '복습', '몰입', '차분함', '다시 읽기')
        WHEN 'workout' THEN ELT(MOD(ds.d - 1, 6) + 1, '호흡', '유지', '균형', '리듬', '땀 한 칸', '몸 살피기')
        WHEN 'hobby' THEN ELT(MOD(ds.d - 1, 6) + 1, '재미', '몰입', '쉼', '손끝', '작은 만족', '다시 꺼내기')
        ELSE ELT(MOD(ds.d - 1, 6) + 1, '오답 확인', '개념 정리', '한 문제씩', '리듬 유지', '차근차근', '다시 시작')
    END,
    NULL,
    ELT(MOD(ds.d - 1, 6) + 1, '포근', '멍함', '반짝', '잔잔', '버팀', '두근'),
    NULL,
    0,
    NULL,
    'PUBLIC',
    TIMESTAMP(
        CURDATE() - INTERVAL (ds.d + MOD(us.n, 4)) DAY,
        MAKETIME(6 + MOD(us.n, 8), MOD(ds.d * 13 + us.n, 60), 0)
    ) + INTERVAL 25 MINUTE,
    CONCAT('seed-share-', LPAD(us.n, 3, '0'), '-', LPAD(ds.d, 2, '0')),
    0,
    TIMESTAMP(
        CURDATE() - INTERVAL (ds.d + MOD(us.n, 4)) DAY,
        MAKETIME(6 + MOD(us.n, 8), MOD(ds.d * 13 + us.n, 60), 0)
    ),
    TIMESTAMP(
        CURDATE() - INTERVAL (ds.d + MOD(us.n, 4)) DAY,
        MAKETIME(6 + MOD(us.n, 8), MOD(ds.d * 13 + us.n, 60), 0)
    ) + INTERVAL 25 MINUTE
FROM user_seq us
JOIN users u
  ON u.provider = 'KAKAO'
 AND u.provider_user_id = CONCAT('seed-community-', LPAD(us.n, 3, '0'))
JOIN paths p
  ON p.user_id = u.id
JOIN day_seq ds;

INSERT INTO reactions (
    record_id,
    user_id,
    created_at
)
SELECT
    r.id,
    actor.id,
    r.shared_at + INTERVAL (MOD(actor.id + r.id, 120) + 1) MINUTE
FROM records r
JOIN users owner
  ON owner.id = r.user_id
 AND owner.provider_user_id LIKE 'seed-community-%'
JOIN users actor
  ON actor.provider_user_id LIKE 'seed-community-%'
 AND actor.id <> owner.id
WHERE MOD(r.id + actor.id, 11) IN (0, 1, 2);

INSERT INTO reactions (
    record_id,
    user_id,
    created_at
)
WITH boost_targets AS (
    SELECT 'seed-share-001-01' AS share_code, 80 AS actor_limit, 45 AS base_minutes
    UNION ALL
    SELECT 'seed-share-002-01', 65, 95
    UNION ALL
    SELECT 'seed-share-005-01', 55, 145
),
actors AS (
    SELECT
        id,
        provider_user_id,
        ROW_NUMBER() OVER (ORDER BY provider_user_id) AS rn
    FROM users
    WHERE provider_user_id LIKE 'seed-community-%'
)
SELECT
    r.id,
    actor.id,
    NOW() - INTERVAL (bt.base_minutes + actor.rn) MINUTE
FROM boost_targets bt
JOIN records r
  ON r.share_code = bt.share_code
JOIN actors actor
  ON actor.rn <= bt.actor_limit
LEFT JOIN reactions existing
  ON existing.record_id = r.id
 AND existing.user_id = actor.id
WHERE existing.id IS NULL
  AND actor.id <> r.user_id;

INSERT INTO comments (
    record_id,
    user_id,
    content,
    deleted,
    created_at,
    updated_at,
    deleted_at
)
SELECT
    r.id,
    actor.id,
    CASE r.category_code
        WHEN 'job' THEN '조급해지지 않으려는 태도가 좋네요. 저도 같은 고민을 하고 있어요.'
        WHEN 'study' THEN '나만의 속도를 지키려는 기록이 인상적이에요.'
        WHEN 'workout' THEN '무리하지 않는 루틴이 오래 가더라고요. 공감해요.'
        WHEN 'hobby' THEN '좋아하는 시간을 챙기려는 마음이 잘 느껴져요.'
        ELSE '작게 나눠서 준비하는 방식이 오래 가는 힘이 되는 것 같아요.'
    END,
    0,
    r.shared_at + INTERVAL (MOD(actor.id + r.id, 180) + 5) MINUTE,
    r.shared_at + INTERVAL (MOD(actor.id + r.id, 180) + 5) MINUTE,
    NULL
FROM records r
JOIN users owner
  ON owner.id = r.user_id
 AND owner.provider_user_id LIKE 'seed-community-%'
JOIN users actor
  ON actor.provider_user_id LIKE 'seed-community-%'
 AND actor.id <> owner.id
WHERE MOD(r.id + actor.id, 17) = 0;

INSERT INTO comments (
    record_id,
    user_id,
    content,
    deleted,
    created_at,
    updated_at,
    deleted_at
)
WITH highlighted_comments AS (
    SELECT 'seed-share-001-01' AS share_code, 1 AS actor_rn, '조용하지만 단단한 흐름이 느껴져요.' AS content, 90 AS minute_offset
    UNION ALL
    SELECT 'seed-share-001-01', 2, '오늘의 한 칸에 집중한 방식이 좋네요.', 82
    UNION ALL
    SELECT 'seed-share-002-01', 3, '페이스를 지키는 기록이라 더 오래 남아요.', 74
    UNION ALL
    SELECT 'seed-share-002-01', 4, '조용하게 쌓이는 공부가 보이네요.', 66
    UNION ALL
    SELECT 'seed-share-005-01', 5, '리듬을 놓치지 않는 준비가 인상적이에요.', 58
    UNION ALL
    SELECT 'seed-share-005-01', 6, '시험 준비를 이렇게 잘게 나누는 방식이 좋네요.', 50
),
actors AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY provider_user_id DESC) AS rn
    FROM users
    WHERE provider_user_id LIKE 'seed-community-%'
)
SELECT
    r.id,
    actor.id,
    hc.content,
    0,
    NOW() - INTERVAL hc.minute_offset MINUTE,
    NOW() - INTERVAL hc.minute_offset MINUTE,
    NULL
FROM highlighted_comments hc
JOIN records r
  ON r.share_code = hc.share_code
JOIN actors actor
  ON actor.rn = hc.actor_rn
WHERE actor.id <> r.user_id;

INSERT INTO comments (
    record_id,
    user_id,
    content,
    deleted,
    created_at,
    updated_at,
    deleted_at
)
WITH burst_target AS (
    SELECT id, shared_at
    FROM records
    WHERE share_code = 'seed-share-001-01'
),
actors AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY provider_user_id) AS rn
    FROM users
    WHERE provider_user_id LIKE 'seed-community-%'
),
templates AS (
    SELECT 0 AS idx, '한 칸씩 가는 흐름이 보여서 좋아요.' AS content
    UNION ALL SELECT 1, '질문이 조용해서 더 오래 머물게 되네요.'
    UNION ALL SELECT 2, '작게 쌓는 방식이 오히려 단단해 보여요.'
    UNION ALL SELECT 3, '저도 같은 고민 중이라 더 공감돼요.'
    UNION ALL SELECT 4, '속도를 지키는 기록이라 더 믿음이 가네요.'
)
SELECT
    bt.id,
    actor.id,
    templates.content,
    0,
    bt.shared_at + INTERVAL actor.rn MINUTE,
    bt.shared_at + INTERVAL actor.rn MINUTE,
    NULL
FROM burst_target bt
JOIN actors actor
  ON actor.rn <= @burst_comment_count
JOIN templates
  ON MOD(actor.rn, 5) = templates.idx
LEFT JOIN comments existing
  ON existing.record_id = bt.id
 AND existing.user_id = actor.id
WHERE existing.id IS NULL;

UPDATE records r
LEFT JOIN (
    SELECT record_id, COUNT(*) AS cnt
    FROM reactions
    GROUP BY record_id
) rc ON rc.record_id = r.id
JOIN users u ON u.id = r.user_id
SET r.reaction_count = COALESCE(rc.cnt, 0)
WHERE u.provider_user_id LIKE 'seed-community-%';

UPDATE paths p
JOIN (
    SELECT path_id, MAX(id) AS cover_record_id
    FROM records
    GROUP BY path_id
) latest ON latest.path_id = p.id
JOIN users u ON u.id = p.user_id
SET p.cover_record_id = latest.cover_record_id
WHERE u.provider_user_id LIKE 'seed-community-%';

SELECT COUNT(*) AS seed_users
FROM users
WHERE provider_user_id LIKE 'seed-community-%';

SELECT COUNT(*) AS seed_paths
FROM paths p
JOIN users u ON u.id = p.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

SELECT COUNT(*) AS seed_records
FROM records r
JOIN users u ON u.id = r.user_id
WHERE u.provider_user_id LIKE 'seed-community-%';

SELECT COUNT(*) AS reactions_count
FROM reactions
WHERE user_id IN (
    SELECT id FROM users WHERE provider_user_id LIKE 'seed-community-%'
);

SELECT COUNT(*) AS comments_count
FROM comments
WHERE user_id IN (
    SELECT id FROM users WHERE provider_user_id LIKE 'seed-community-%'
);
