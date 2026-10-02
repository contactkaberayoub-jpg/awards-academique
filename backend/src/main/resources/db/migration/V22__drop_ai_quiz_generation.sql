-- Removes the paid AI Quiz Generator for instructors (feature removed).
-- V20 (which created this table) has been deleted, so this migration is a
-- no-op on fresh databases and a cleanup on databases that already applied V20.
DROP INDEX IF EXISTS idx_ai_quiz_generation_user;
DROP INDEX IF EXISTS idx_ai_quiz_generation_course;
DROP INDEX IF EXISTS idx_ai_quiz_generation_status;
DROP TABLE IF EXISTS ai_quiz_generation;