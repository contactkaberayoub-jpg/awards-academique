-- Optional schema evolution for the existing public.lesson_progress table.
-- Adds auditing timestamps (created_at, updated_at) and enforces a single
-- progress row per (enrollment, lesson) pair.
--
-- Idempotent: every DDL below uses IF NOT EXISTS. Safe to re-run.

ALTER TABLE lesson_progress
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE lesson_progress
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_lesson_progress_enrollment_lesson'
    ) THEN
        ALTER TABLE lesson_progress
            ADD CONSTRAINT uk_lesson_progress_enrollment_lesson
            UNIQUE (enrollment_id, lesson_id);
    END IF;
END $$;

-- Index helpers for the two main query paths (list progress per enrollment / per lesson).
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment
    ON lesson_progress (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson
    ON lesson_progress (lesson_id);
