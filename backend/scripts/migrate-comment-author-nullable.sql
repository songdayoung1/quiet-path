-- Keep comment content while removing the author relationship after withdrawal.
ALTER TABLE comments
    MODIFY COLUMN user_id BIGINT NULL;
