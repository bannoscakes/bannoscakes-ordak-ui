-- Migration: 20250114_verify_realtime_publication
-- Purpose: Ensure realtime publication exists for messaging system
-- Idempotent: Safe to run multiple times
-- Dependencies: Requires messaging tables (20241008_fix_messaging_system_final.sql)

DO $$
BEGIN
  -- ensure publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- helper: add table to publication only if the table exists and isn't already in the pub
  PERFORM 1
  FROM pg_publication_tables
  WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations';
  IF to_regclass('public.conversations') IS NOT NULL AND NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
    RAISE NOTICE 'Added conversations to publication';
  END IF;

  PERFORM 1
  FROM pg_publication_tables
  WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages';
  IF to_regclass('public.messages') IS NOT NULL AND NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
    RAISE NOTICE 'Added messages to publication';
  END IF;

  -- optional: only if you actually have this table; safe-guarded the same way
  PERFORM 1
  FROM pg_publication_tables
  WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversation_participants';
  IF to_regclass('public.conversation_participants') IS NOT NULL AND NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants';
    RAISE NOTICE 'Added conversation_participants to publication';
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- keep noisy but non-fatal; adjust to RAISE if you prefer hard-fail
  RAISE WARNING 'verify_realtime_publication: %', SQLERRM;
END$$;
