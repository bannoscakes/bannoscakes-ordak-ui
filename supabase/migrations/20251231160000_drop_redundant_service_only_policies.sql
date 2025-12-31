-- Drop redundant *_service_only policies to fix remaining multiple_permissive_policies warnings
--
-- Issue: These policies target 'public' role with FOR ALL, using rls_bypass().
-- Since 'authenticated' inherits from 'public', these overlap with authenticated policies.
-- service_role bypasses RLS entirely, so these policies serve no functional purpose.
--
-- Warnings fixed (15 total):
-- - dead_letter: 4 warnings (SELECT/INSERT/UPDATE/DELETE overlap with dead_letter_admin_only, dead_letter_block_*)
-- - work_queue: 4 warnings (SELECT/INSERT/UPDATE/DELETE overlap with work_queue_admin_only, work_queue_block_*)
-- - order_photos: 4 warnings (SELECT/INSERT/UPDATE/DELETE overlap with order_photos_*_via_rpc, order_photos_select_authenticated)
-- - conversation_participants: 1 warning (participants_select overlaps with conversation_participants_select_own)
--
-- Also dropping service_only policies on tables without warnings (for consistency):
-- - api_logs_service_only
-- - bom_headers_service_only
-- - inventory_txn_service_only
-- - orders_modify_service_only

-- ============================================
-- Tables with performance warnings
-- ============================================

-- dead_letter: drop service_only (overlaps with dead_letter_admin_only + dead_letter_block_*)
DROP POLICY IF EXISTS "dead_letter_service_only" ON public.dead_letter;

-- work_queue: drop service_only (overlaps with work_queue_admin_only + work_queue_block_*)
DROP POLICY IF EXISTS "work_queue_service_only" ON public.work_queue;

-- order_photos: drop service_only (overlaps with order_photos_select_authenticated + order_photos_*_via_rpc)
DROP POLICY IF EXISTS "order_photos_modify_service_only" ON public.order_photos;

-- conversation_participants: drop duplicate SELECT policy
-- Note: Unlike the *_service_only policies above which use rls_bypass(),
-- participants_select uses auth.uid() logic. Still safe to drop because
-- conversation_participants_select_own (authenticated) covers the same access
-- with additional Admin role check.
-- Keep: conversation_participants_select_own (authenticated, comprehensive)
-- Drop: participants_select (public, subset of above)
DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;

-- ============================================
-- Tables without warnings (cleanup for consistency)
-- These tables may not exist in preview, so use conditional blocks
-- ============================================

DO $$
BEGIN
  -- api_logs: no authenticated policies exist, so no warning, but still redundant
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_logs') THEN
    DROP POLICY IF EXISTS "api_logs_service_only" ON public.api_logs;
  END IF;

  -- bom_headers: no authenticated policies exist, so no warning, but still redundant
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bom_headers') THEN
    DROP POLICY IF EXISTS "bom_headers_service_only" ON public.bom_headers;
  END IF;

  -- inventory_txn: no authenticated policies exist, so no warning, but still redundant
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_txn') THEN
    DROP POLICY IF EXISTS "inventory_txn_service_only" ON public.inventory_txn;
  END IF;

  -- orders: drop service_only (service_role bypasses RLS anyway)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    DROP POLICY IF EXISTS "orders_modify_service_only" ON public.orders;
  END IF;
END $$;

-- ============================================
-- Drop orphaned rls_bypass() function
-- ============================================
-- After dropping the policies above, rls_bypass() has no remaining callers.
-- Codebase search confirmed it only appeared in:
-- - supabase/migrations/040_core_auth_helpers.sql (definition)
-- - src/types/supabase.ts (auto-generated, will be regenerated)
-- - scripts/production_rpcs.json (snapshot, will be updated)
-- - scripts/parse_rpcs.js (was already filtered from frontend exposure)
--
-- No Edge Functions or SECURITY DEFINER RPCs depend on it.
DROP FUNCTION IF EXISTS public.rls_bypass();
