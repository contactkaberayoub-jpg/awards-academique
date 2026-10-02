-- Optional schema evolution for the existing public.quiz_attempts table.
-- Adds audit timestamps + lookup indexes. Idempotent (IF NOT EXISTS) so it is
-- safe to re-run against Supabase even if the columns or indexes exist.

ALTER TABLE quiz_attempts
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE quiz_attempts
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz_status
    ON quiz_attempts (user_id, quiz_id, status);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz
    ON quiz_attempts (quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_started_at
    ON quiz_attempts (started_at DESC);
