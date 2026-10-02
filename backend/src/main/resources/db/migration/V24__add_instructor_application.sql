DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instructor_status_enum') THEN
        CREATE TYPE instructor_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END
$$;

ALTER TABLE users ADD COLUMN instructor_status instructor_status_enum;
ALTER TABLE users ADD COLUMN instructor_rejection_reason TEXT;
ALTER TABLE users ADD COLUMN professional_title VARCHAR(150);
ALTER TABLE users ADD COLUMN institution VARCHAR(255);
ALTER TABLE users ADD COLUMN expertise TEXT;
ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(500);
ALTER TABLE users ADD COLUMN instructor_submitted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN instructor_reviewed_at TIMESTAMP;
