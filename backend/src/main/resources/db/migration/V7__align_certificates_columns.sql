-- Completes the alignment of the certificates table with the Certificate entity.
-- The shared database contained a legacy certificates table (see V6); this
-- migration adds the remaining columns the entity expects.
ALTER TABLE public.certificates
    ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE public.certificates
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Backfill created_at from issued_at for legacy rows.
UPDATE public.certificates
SET created_at = issued_at
WHERE created_at IS NULL;

ALTER TABLE public.certificates
    ALTER COLUMN created_at SET NOT NULL;
