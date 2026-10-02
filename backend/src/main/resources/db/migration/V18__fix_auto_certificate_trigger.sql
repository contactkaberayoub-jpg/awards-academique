-- Fixes the DB trigger fn_auto_generate_certificate() so that newly
-- auto-generated certificates also populate certificate_code and created_at.
--
-- V6 added certificates.certificate_code as NOT NULL (after backfilling legacy
-- rows), but the legacy AFTER UPDATE trigger on enrollments (created directly
-- against the live database, not via a Flyway migration) inserted certificates
-- without certificate_code — and later V7 made created_at NOT NULL too.
-- Both columns were left NULL on new auto-generated certificates, causing a
-- NOT NULL violation whenever a lesson_progress update pushed an enrollment to
-- 100% and the trigger tried to mint a certificate. That surfaced as HTTP 409
-- Conflict ("Data integrity violation on progress operation") from the
-- /progress/lessons/{id}/completed endpoint.

CREATE OR REPLACE FUNCTION public.fn_auto_generate_certificate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.completion_percentage = 100 AND OLD.completion_percentage < 100 THEN
        INSERT INTO certificates (user_id, course_id, certificate_number, certificate_code, created_at)
        VALUES (
            NEW.user_id,
            NEW.course_id,
            fn_generate_certificate_number(),
            'CERT-' || UPPER(REPLACE(uuid_generate_v4()::text, '-', '')),
            NOW()
        )
        ON CONFLICT (user_id, course_id) DO NOTHING;

        UPDATE enrollments
        SET status = 'completed', completed_at = NOW()
        WHERE id = NEW.id;

        INSERT INTO notifications (user_id, type, title, content)
        VALUES (NEW.user_id, 'certificate', 'Certificate earned!',
                'You have completed the course and earned a certificate.');
    END IF;
    RETURN NEW;
END;
$function$
