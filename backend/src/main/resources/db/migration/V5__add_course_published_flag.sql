-- Introduces the explicit course publication flag and migrates the legacy
-- 'in_review' state to the new 'pending' workflow state. The UPDATE statements
-- intentionally live in their own migration (separate transaction) so that a
-- native PostgreSQL enum can use the values added by V4.
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.courses SET status = 'pending' WHERE status = 'in_review';
UPDATE public.courses SET published = (status = 'published');
