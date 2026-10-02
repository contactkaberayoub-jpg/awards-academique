DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'lessons'
          AND column_name = 'deleted_at'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'lessons'
          AND column_name = 'delete_at'
    ) THEN
        ALTER TABLE public.lessons RENAME COLUMN deleted_at TO delete_at;
    END IF;
END $$;
