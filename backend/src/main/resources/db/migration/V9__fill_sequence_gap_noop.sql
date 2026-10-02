-- V9 placeholder (gap-filler; originally missing between V8 and V10).
-- Left intentionally empty (no-op) so that the Flyway version sequence V1..V11
-- is continuous and future developers do not wonder whether a migration was lost.
DO $$ BEGIN
  RAISE NOTICE 'V9 noop applied (fills sequence gap between V8 and V10).';
END $$;
