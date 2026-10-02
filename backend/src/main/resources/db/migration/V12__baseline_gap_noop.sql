-- Explicitly marks the gap between "schema exists only in Supabase console" and "V1..V12 ALTER
-- migrations live in repo". See V0__baseline_schema_export_placeholder.sql for full details.
-- This migration is intentionally a no-op; it exists only so the audit finding is durable.
DO $$ BEGIN
  RAISE NOTICE 'V12 applied. Baseline initial CREATE TABLE migration: still TBD from Supabase export (see V0 placeholder header).';
END $$;
