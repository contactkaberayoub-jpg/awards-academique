-- ============================================================================
-- V0__baseline_schema_export_placeholder.sql
-- ----------------------------------------------------------------------------
-- RECONSTRUCTED BASELINE — the original 18-table schema that predates V1.
--
-- WHY THIS FILE EXISTS
--   The original CREATE TABLE statements lived only in the Supabase console and
--   were never committed to the repo. Every migration V1..V26 uses ALTER-only
--   DDL (or IF NOT EXISTS CREATE) and therefore assumes the base tables already
--   exist. A fresh clone could NOT rebuild the database from migrations alone.
--
--   This baseline is the reconstructed pre-V1 schema. It was derived by:
--     1. starting from the CURRENT Java entity mappings (Hibernate column
--        names/types/constraints under backend/src/main/java/.../entity); and
--     2. subtracting every column/constraint/index that a later migration
--        (V1..V26) adds or renames — so that V1..V26 still apply cleanly and the
--        end state matches the audited live schema.
--
--   The most notable "subtractions" (added later, so ABSENT here on purpose):
--     - lessons.status                                (added by V1)
--     - lessons.delete_at                             (renamed from deleted_at by V2)
--     - courses.published                             (added by V5)
--     - courses.logo_url                              (added by V17)
--     - certificates.certificate_code / created_at    (added by V6 / V7)
--     - lesson_progress.updated_at / created_at       (added by V8/V15)
--     - quiz_attempts.created_at / updated_at         (added by V10/V15)
--     - instructor/payout/password-reset/cart tables  (created by V16/V21/V23/V26)
--     - enrollments/reviews unique (user, course)     (added by V11)
--     - lesson_progress uk (enrollment, lesson)       (added by V8)
--
--   Objects below that NO migration creates but that later migrations REQUIRE
--   are brought forward into this baseline, because a fresh database needs them
--   before V18/V19 can run:
--     - pgcrypto extension                            (uuid_generate_v4)
--     - public.fn_generate_certificate_number()       (used by V18/V19 + certificate_number default)
--     - certificates UNIQUE (user_id, course_id)      (target of the trigger ON CONFLICT)
--     - all NAMED_ENUM PostgreSQL types the entities map with @JdbcTypeCode
--
-- SCOPE / ENVIRONMENT
--   * FRESH database (dev/test/staging recycle):  this migration runs first,
--     then V1..V26 evolve it. This is the intended primary path.
--   * EXISTING live Supabase database:  the repository runs with
--     flyway.baseline-on-migrate=true / baseline-version=0, so this file is NOT
--     re-applied to it; the live schema is preserved as-is.
--
--   RLS policies are NOT reproduced here: the backend talks to Postgres over
--   JDBC (bypass-role-leak-proof, not PostgREST), so RLS does not gate the app.
--   If the instance ever exposes the schema via Supabase PostgREST/Data API,
--   re-apply the original RLS policies manually.
--
--   Faithfulness caveat: the exact original export was never committed, so this
--   is an audited reconstruction (entity schema minus later migrations), not a
--     byte-for-byte Supabase console export. Verify against a real export if one
--   becomes available; any differences will be surfaced by the V1..V26 audit
--   trail (everything below is IF NOT EXISTS / idempotent by design).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extension required by V18/V19 (uuid_generate_v4) and by the certificate
-- number function.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ---------------------------------------------------------------------------
-- NAMED ENUM types (Hibernate @JdbcTypeCode(SqlTypes.NAMED_ENUM))
-- ---------------------------------------------------------------------------
CREATE TYPE user_role_enum AS ENUM ('administrator', 'student', 'instructor');

-- course status: the pre-V1 type also carried the legacy 'in_review' state that
-- V5 migrates to 'pending'; V4 then adds 'pending'/'rejected' (no-ops here).
CREATE TYPE course_status_enum AS ENUM ('draft', 'published', 'archived', 'in_review');

CREATE TYPE lesson_type_enum AS ENUM ('video', 'text', 'pdf', 'quiz', 'assignment');
CREATE TYPE lesson_resource_type_enum AS ENUM ('pdf', 'video', 'link', 'file');
CREATE TYPE quiz_status_enum AS ENUM ('draft', 'published', 'archived');
CREATE TYPE attempt_status_enum AS ENUM ('in_progress', 'passed', 'failed');
CREATE TYPE enrollment_status_enum AS ENUM ('active', 'completed', 'suspended', 'cancelled');
CREATE TYPE order_status_enum AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE currency_enum AS ENUM ('MAD', 'EUR', 'USD');
CREATE TYPE review_status_enum AS ENUM ('visible', 'hidden', 'flagged');
CREATE TYPE notification_type_enum AS ENUM ('payment', 'course', 'certificate', 'ai', 'system');

-- ---------------------------------------------------------------------------
-- Certificate number generator. Referenced by V18/V19 and (from V19) as the
-- DB default for certificates.certificate_number. Matches the Java
-- CertificateServiceImpl "CERT-" prefix convention.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.fn_generate_certificate_number()
RETURNS varchar
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'CERT-' || UPPER(REPLACE(uuid_generate_v4()::text, '-', ''));
END;
$$;

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
CREATE TABLE public.roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        user_role_enum NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT roles_name_key UNIQUE (name)
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id           UUID NOT NULL REFERENCES public.roles(id),
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255),
    avatar_url        VARCHAR(500),
    bio               TEXT,
    oauth_provider    VARCHAR(50),
    oauth_id          VARCHAR(255),
    refresh_token_hash VARCHAR(255),
    last_login_at     TIMESTAMP,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMP,
    CONSTRAINT users_email_key UNIQUE (email)
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     UUID REFERENCES public.categories(id),
    name          VARCHAR(150) NOT NULL,
    slug          VARCHAR(150) NOT NULL,
    icon_url      TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT categories_name_key UNIQUE (name),
    CONSTRAINT categories_slug_key UNIQUE (slug)
);

-- ---------------------------------------------------------------------------
-- courses
-- NOTE: 'published' and 'logo_url' are intentionally ABSENT (added by V5/V17).
-- 'currency' + 'level' are plain VARCHAR (EnumType.STRING, not NAMED_ENUM).
-- ---------------------------------------------------------------------------
CREATE TABLE public.courses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id      UUID NOT NULL REFERENCES public.users(id),
    category_id        UUID REFERENCES public.categories(id),
    title              VARCHAR(255) NOT NULL,
    subtitle           VARCHAR(255),
    description        TEXT,
    learning_objectives TEXT,
    level              VARCHAR(20) NOT NULL,
    status             course_status_enum NOT NULL DEFAULT 'draft',
    is_free            BOOLEAN NOT NULL DEFAULT FALSE,
    price              NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency           VARCHAR(8) NOT NULL DEFAULT 'MAD',
    thumbnail_url      TEXT,
    promo_video_url    TEXT,
    duration_minutes   INTEGER NOT NULL DEFAULT 0,
    average_rating     NUMERIC(3, 2) NOT NULL DEFAULT 0,
    reviews_count      INTEGER NOT NULL DEFAULT 0,
    enrollments_count  INTEGER NOT NULL DEFAULT 0,
    published_at       TIMESTAMP,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMP,
    CONSTRAINT courses_price_check       CHECK (price >= 0),
    CONSTRAINT chk_courses_free_price    CHECK (NOT is_free OR price = 0),
    CONSTRAINT courses_average_rating_check CHECK (average_rating >= 0 AND average_rating <= 5)
);

-- ---------------------------------------------------------------------------
-- course_sections
-- ---------------------------------------------------------------------------
CREATE TABLE public.course_sections (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id     UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- lessons
-- NOTE: 'status' is intentionally ABSENT (added by V1).
-- The original soft-delete column was named 'deleted_at' (renamed to
-- 'delete_at' by V2).
-- ---------------------------------------------------------------------------
CREATE TABLE public.lessons (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id       UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    content          TEXT,
    lesson_type      lesson_type_enum NOT NULL DEFAULT 'text',
    video_url        TEXT,
    is_free_preview  BOOLEAN NOT NULL DEFAULT FALSE,
    display_order    INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- lesson_resources
-- ---------------------------------------------------------------------------
CREATE TABLE public.lesson_resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    resource_type   lesson_resource_type_enum NOT NULL,
    file_url        TEXT NOT NULL,
    file_size_bytes BIGINT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- quizzes (course-level when lesson_id IS NULL, lesson-linked otherwise)
-- ---------------------------------------------------------------------------
CREATE TABLE public.quizzes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id     UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id     UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    status        quiz_status_enum NOT NULL DEFAULT 'draft',
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts  INTEGER NOT NULL DEFAULT 3,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
CREATE TABLE public.questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id       UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    statement     TEXT NOT NULL,
    explanation   TEXT,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- question_options
-- ---------------------------------------------------------------------------
CREATE TABLE public.question_options (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id   UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text   TEXT NOT NULL,
    is_correct    BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- quiz_attempts
-- NOTE: created_at / updated_at are intentionally ABSENT (added by V10/V15).
-- ---------------------------------------------------------------------------
CREATE TABLE public.quiz_attempts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quiz_id      UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    score        NUMERIC(5, 2) NOT NULL DEFAULT 0,
    status       attempt_status_enum NOT NULL DEFAULT 'in_progress',
    answers      JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- enrollments
-- NOTE: unique (user_id, course_id) is added later by V11, so it is ABSENT here.
-- ---------------------------------------------------------------------------
CREATE TABLE public.enrollments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id             UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status                enrollment_status_enum NOT NULL DEFAULT 'active',
    completion_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    enrolled_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity_at      TIMESTAMP,
    completed_at          TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id),
    course_id    UUID NOT NULL REFERENCES public.courses(id),
    status       order_status_enum NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency     currency_enum NOT NULL DEFAULT 'MAD',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- certificates
-- NOTE: certificate_code is absent (added by V6), file_url + created_at absent
-- (added by V7). The UNIQUE (user_id, course_id) constraint below is required
-- by the fn_auto_generate_certificate() trigger's ON CONFLICT clause (V18/V19).
-- ---------------------------------------------------------------------------
CREATE TABLE public.certificates (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id          UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_number VARCHAR(255) NOT NULL,
    issued_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_certificates_user_course UNIQUE (user_id, course_id)
);

-- ---------------------------------------------------------------------------
-- reviews
-- NOTE: unique (user_id, course_id) is added later by V11, so it is ABSENT here.
-- ---------------------------------------------------------------------------
CREATE TABLE public.reviews (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id  UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL,
    comment    TEXT,
    status     review_status_enum NOT NULL DEFAULT 'visible',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type       notification_type_enum NOT NULL DEFAULT 'system',
    title      VARCHAR(255) NOT NULL,
    content    TEXT,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- ai_conversations / ai_messages (AI tutor chat history)
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_conversations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title      VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ai_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    sender          VARCHAR(20) NOT NULL,
    content         TEXT,
    tokens_used     INTEGER,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);