-- Migration: 097_fix_remaining_search_paths.sql
-- Purpose: Fix remaining functions with mutable search_path
-- This sets search_path = 'public' for ALL public functions that don't have it set

DO $$
DECLARE
  r RECORD;
  fixed_count INTEGER := 0;
BEGIN
  -- Loop through all functions in public schema that need search_path set
  FOR r IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig)))
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = %L', r.proname, r.args, 'public');
    RAISE NOTICE '%', format('Set search_path for: public.%s(%s)', r.proname, r.args);
    fixed_count := fixed_count + 1;
  END LOOP;

  RAISE NOTICE '%', format('Fixed %s functions total', fixed_count);
END;
$$;
