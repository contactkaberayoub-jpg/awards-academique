DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_lessons_status'
          AND conrelid = 'public.lessons'::regclass
    ) THEN
        ALTER TABLE public.lessons
            ADD CONSTRAINT chk_lessons_status
            CHECK (status IN ('draft', 'published', 'archived'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lessons_section_active_order
    ON public.lessons (section_id, display_order)
    WHERE delete_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_active_status_created
    ON public.lessons (status, created_at DESC)
    WHERE delete_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_course_sections_course_active
    ON public.course_sections (course_id)
    WHERE deleted_at IS NULL;
