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
-- Keep conversation_participants_select_own (authenticated, comprehensive with Admin check)
-- Drop participants_select (public, simpler version)
DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;

-- ============================================
-- Tables without warnings (cleanup for consistency)
-- ============================================

-- api_logs: no authenticated policies exist, so no warning, but still redundant
DROP POLICY IF EXISTS "api_logs_service_only" ON public.api_logs;

-- bom_headers: no authenticated policies exist, so no warning, but still redundant
DROP POLICY IF EXISTS "bom_headers_service_only" ON public.bom_headers;

-- inventory_txn: no authenticated policies exist, so no warning, but still redundant
DROP POLICY IF EXISTS "inventory_txn_service_only" ON public.inventory_txn;

-- orders: drop service_only (service_role bypasses RLS anyway)
-- Conditional: orders table may not exist in preview
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    DROP POLICY IF EXISTS "orders_modify_service_only" ON public.orders;
  END IF;
END $$;

-- ============================================
-- Also drop the rls_bypass() function if no longer needed
-- ============================================
-- Note: Keeping rls_bypass() for now as it may be used elsewhere.
-- It's a harmless helper function that doesn't cause performance issues.
