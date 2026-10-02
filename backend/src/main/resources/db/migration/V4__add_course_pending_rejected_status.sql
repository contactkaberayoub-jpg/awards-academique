-- Adds the 'pending' and 'rejected' states to the courses.status column when it
-- is backed by a native PostgreSQL enum type. This is a no-op when the column is
-- a plain VARCHAR (the legacy schema style used by earlier migrations).
DO $$
DECLARE
    enum_schema TEXT;
    enum_type_name TEXT;
BEGIN
    SELECT n.nspname, t.typname
      INTO enum_schema, enum_type_name
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_type t ON t.oid = a.atttypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE c.relname = 'courses'
       AND a.attname = 'status'
       AND t.typtype = 'e'
     LIMIT 1;

    IF enum_type_name IS NOT NULL THEN
        BEGIN
            EXECUTE format('ALTER TYPE %I.%I ADD VALUE ''pending''', enum_schema, enum_type_name);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
        BEGIN
            EXECUTE format('ALTER TYPE %I.%I ADD VALUE ''rejected''', enum_schema, enum_type_name);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;
