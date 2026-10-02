-- Ensures the DB safety-layer trigger fn_auto_generate_certificate() respects the
-- same formal-completion rule as the Java source of truth (CourseCompletionPipeline):
--
--     allStepsDone
--     AND allLessonsDone
--     AND allPublishedQuizzesPassed
--
-- Before this fix the trigger fired whenever enrollment.completion_percentage reached
-- 100 (a percentage that can be driven up by the lessons-only database formula) and
-- UNCONDITIONALLY:
--   1. set enrollments.status = 'completed'
--   2. inserted a certificate
--   3. inserted a certificate notification
--
-- That let a course become formally completed (and a certificate granted) even though a
-- published course-level quiz (lesson_id IS NULL) had never been passed — and then
-- QuizAttemptValidator rejected further attempts (enrollment already status=completed),
-- surfacing as HTTP 409.
--
-- The trigger now only performs completion/certificate/notification work when the
-- enrollment is actually transitioning to completed AND every published quiz for the
-- course (lesson-linked OR course-level) has at least one passed attempt for the user.
--
-- Java (CourseCompletionPipeline.recomputeAndPersist) remains the source of truth; this
-- trigger is merely a database-level safety layer that enforces the same rule.
--
-- The certificates.certificate_number column is NOT NULL with no default, but the Java
-- source-of-truth persistence path (CertificateServiceImpl.issueForCompletion -> Hibernate
-- INSERT on the Certificate entity) does not map that column, so the insert would fail with
-- a NOT NULL violation whenever a course is formally completed through Java (turning the
-- quiz submit / lesson-complete transaction into an HTTP 409). Give it a database default
-- generated from the same function the trigger uses, so inserts that omit the column still
-- produce a valid, unique certificate_number. Explicit values (as used by the trigger below)
-- continue to take precedence over the default.

ALTER TABLE certificates
    ALTER COLUMN certificate_number SET DEFAULT fn_generate_certificate_number();

CREATE OR REPLACE FUNCTION public.fn_auto_generate_certificate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only act when the enrollment is being moved to completed at 100% progress.
    -- Requiring OLD.status <> 'completed' makes this idempotent and recursion-safe:
    -- once completed the trigger short-circuits on every later save.
    IF NEW.completion_percentage = 100
       AND NEW.status::text = 'completed'
       AND OLD.status::text <> 'completed' THEN

        -- Formal completion gate: every published quiz (lesson-linked OR course-level,
        -- i.e. lesson_id IS NOT NULL or IS NULL) must have at least one PASSED attempt
        -- with score >= passing_score for this user. Mirrors the Java predicate
        -- QuizAttemptRepository.existsPassedAttemptForUserOnQuiz.
        IF EXISTS (
            SELECT 1
            FROM quizzes q
            WHERE q.course_id = NEW.course_id
              AND q.status = 'published'::quiz_status_enum
              AND NOT EXISTS (
                  SELECT 1
                  FROM quiz_attempts qa
                  WHERE qa.quiz_id = q.id
                    AND qa.user_id = NEW.user_id
                    AND qa.status = 'passed'::attempt_status_enum
                    AND qa.score >= COALESCE(q.passing_score, 0)
              )
        ) THEN
            -- A published quiz is still unpassed -> course MUST NOT be completed,
            -- no certificate, no notification; enrollment remains active so the
            -- student stays allowed to take the quiz.
            RETURN NEW;
        END IF;

        -- Certificate: idempotent via the existing unique (user_id, course_id) constraint.
        INSERT INTO certificates (user_id, course_id, certificate_number, certificate_code, created_at)
        VALUES (
            NEW.user_id,
            NEW.course_id,
            fn_generate_certificate_number(),
            'CERT-' || UPPER(REPLACE(uuid_generate_v4()::text, '-', '')),
            NOW()
        )
        ON CONFLICT (user_id, course_id) DO NOTHING;

        -- Notification: only when the certificate / formal completion actually happens;
        -- guarded so a duplicate is never emitted on repeated firings.
        INSERT INTO notifications (user_id, type, title, content)
        SELECT NEW.user_id, 'certificate', 'Certificate earned!',
               'You have completed the course and earned a certificate.'
        WHERE NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = NEW.user_id
              AND n.type = 'certificate'
              AND n.title = 'Certificate earned!'
        );

        -- Stamps completion time only once; WHERE completed_at IS NULL prevents the
        -- recursive AFTER-UPDATE re-entry from doing anything (and keeps idempotency).
        UPDATE enrollments
        SET completed_at = COALESCE(completed_at, NOW())
        WHERE id = NEW.id AND completed_at IS NULL;
    END IF;
    RETURN NEW;
END;
$function$;

-- The trigger itself was historically created directly against the live database (not via a
-- migration), so on a fresh database it may not exist. Recreate it idempotently so this
-- migration is safe both on a fresh DB and on one where the old trigger already exists
-- (no duplicate trigger is created).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_auto_certificate'
          AND tgrelid = 'public.enrollments'::regclass
    ) THEN
        CREATE TRIGGER trg_auto_certificate
        AFTER UPDATE ON public.enrollments
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_auto_generate_certificate();
    END IF;
END $$;
