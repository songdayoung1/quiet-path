-- 회원탈퇴 후 작성자를 익명으로 유지할 수 있도록 댓글 작성자 참조를 nullable로 변경한다.
ALTER TABLE comments
    MODIFY COLUMN user_id BIGINT NULL;
