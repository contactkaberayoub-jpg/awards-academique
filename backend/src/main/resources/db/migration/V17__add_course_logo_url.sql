-- Adds an optional technology/company logo for course cards.
-- The logo is displayed as a small overlay in the top-right corner of the card image.
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS logo_url TEXT;