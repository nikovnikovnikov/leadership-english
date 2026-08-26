-- Grant table permissions to Supabase roles
-- Run this in SQL Editor

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.tablename);
  END LOOP;
END;
$$;

-- Sequences need grants too for INSERT/UPDATE with serial/bigserial
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT USAGE ON public.%I TO authenticated', seq.sequencename);
  END LOOP;
END;
$$;
