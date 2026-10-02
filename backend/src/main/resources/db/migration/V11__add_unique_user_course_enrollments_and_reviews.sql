-- Ensure one enrollment per (user, course) and one review per (user, course) at the
-- database level (the ultimate safety net, even if service-level checks race).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'enrollments_user_id_course_id_unq'
      AND conrelid = 'enrollments'::regclass
  ) THEN
    ALTER TABLE enrollments
      ADD CONSTRAINT enrollments_user_id_course_id_unq
      UNIQUE (user_id, course_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_user_id_course_id_unq'
      AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_user_id_course_id_unq
      UNIQUE (user_id, course_id);
  END IF;
END $$;
