-- V15__add_timestamps_lesson_progress_quiz_attempts.sql
-- Add audit timestamps to the two tables that were missing them.

-- ---------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------
ALTER TABLE lesson_progress
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE lesson_progress
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------
-- quiz_attempts
-- ---------------------------------------------------------------------
ALTER TABLE quiz_attempts
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE quiz_attempts
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();