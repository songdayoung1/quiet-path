-- System notifications do not have an actor user.
ALTER TABLE notifications
    MODIFY COLUMN actor_user_id BIGINT NULL;
