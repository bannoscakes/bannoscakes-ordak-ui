-- Consolidate multiple permissive policies to fix Supabase Performance Advisor warnings
-- Issue: FOR ALL policies create implicit SELECT/INSERT/UPDATE/DELETE that overlap with specific policies
-- Fix: Replace FOR ALL with individual action policies, drop legacy duplicates

-- ============================================
-- Pattern 1: Replace *_no_direct_writes (FOR ALL) with individual action policies
-- These block writes but have separate SELECT policies causing duplicates
-- ============================================

-- conversation_participants: has conversation_participants_no_direct_writes (ALL) + conversation_participants_select_own (SELECT)
DROP POLICY IF EXISTS "conversation_participants_no_direct_writes" ON public.conversation_participants;
-- Keep conversation_participants_select_own for SELECT
-- participants_insert, participants_delete already exist for INSERT/DELETE
-- Add missing UPDATE blocking policy
CREATE POLICY "conversation_participants_block_update" ON public.conversation_participants
  FOR UPDATE TO authenticated USING (false);

-- message_reads: has message_reads_no_direct_writes (ALL) + message_reads_select_participants (SELECT)
DROP POLICY IF EXISTS "message_reads_no_direct_writes" ON public.message_reads;
-- Keep message_reads_select_participants for SELECT
-- reads_insert, reads_update already exist for INSERT/UPDATE
-- Add missing DELETE blocking policy
CREATE POLICY "message_reads_block_delete" ON public.message_reads
  FOR DELETE TO authenticated USING (false);

-- processed_webhooks: has processed_webhooks_no_direct_writes (ALL) + processed_webhooks_admin_only (SELECT)
DROP POLICY IF EXISTS "processed_webhooks_no_direct_writes" ON public.processed_webhooks;
CREATE POLICY "processed_webhooks_block_insert" ON public.processed_webhooks
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "processed_webhooks_block_update" ON public.processed_webhooks
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "processed_webhooks_block_delete" ON public.processed_webhooks
  FOR DELETE TO authenticated USING (false);

-- shopify_sync_runs: has shopify_sync_runs_no_direct_writes (ALL) + shopify_sync_runs_admin_only (SELECT)
DROP POLICY IF EXISTS "shopify_sync_runs_no_direct_writes" ON public.shopify_sync_runs;
CREATE POLICY "shopify_sync_runs_block_insert" ON public.shopify_sync_runs
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "shopify_sync_runs_block_update" ON public.shopify_sync_runs
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "shopify_sync_runs_block_delete" ON public.shopify_sync_runs
  FOR DELETE TO authenticated USING (false);

-- webhook_inbox_bannos: has webhook_inbox_bannos_no_direct_writes (ALL) + webhook_inbox_bannos_admin_only (SELECT)
DROP POLICY IF EXISTS "webhook_inbox_bannos_no_direct_writes" ON public.webhook_inbox_bannos;
CREATE POLICY "webhook_inbox_bannos_block_insert" ON public.webhook_inbox_bannos
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "webhook_inbox_bannos_block_update" ON public.webhook_inbox_bannos
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "webhook_inbox_bannos_block_delete" ON public.webhook_inbox_bannos
  FOR DELETE TO authenticated USING (false);

-- webhook_inbox_flourlane: has webhook_inbox_flourlane_no_direct_writes (ALL) + webhook_inbox_flourlane_admin_only (SELECT)
DROP POLICY IF EXISTS "webhook_inbox_flourlane_no_direct_writes" ON public.webhook_inbox_flourlane;
CREATE POLICY "webhook_inbox_flourlane_block_insert" ON public.webhook_inbox_flourlane
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "webhook_inbox_flourlane_block_update" ON public.webhook_inbox_flourlane
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "webhook_inbox_flourlane_block_delete" ON public.webhook_inbox_flourlane
  FOR DELETE TO authenticated USING (false);

-- dead_letter: has dead_letter_no_direct_writes (ALL) + dead_letter_admin_only (SELECT)
DROP POLICY IF EXISTS "dead_letter_no_direct_writes" ON public.dead_letter;
CREATE POLICY "dead_letter_block_insert" ON public.dead_letter
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "dead_letter_block_update" ON public.dead_letter
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "dead_letter_block_delete" ON public.dead_letter
  FOR DELETE TO authenticated USING (false);

-- work_queue: has work_queue_no_direct_writes (ALL) + work_queue_admin_only (SELECT)
DROP POLICY IF EXISTS "work_queue_no_direct_writes" ON public.work_queue;
CREATE POLICY "work_queue_block_insert" ON public.work_queue
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "work_queue_block_update" ON public.work_queue
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "work_queue_block_delete" ON public.work_queue
  FOR DELETE TO authenticated USING (false);

-- ============================================
-- Pattern 2: Replace *_write_admin_only (FOR ALL) with individual action policies
-- ============================================

-- settings: has settings_write_admin_only (ALL) + settings_select_admin_supervisor (SELECT)
DROP POLICY IF EXISTS "settings_write_admin_only" ON public.settings;
CREATE POLICY "settings_insert_admin_only" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'Admin');
CREATE POLICY "settings_update_admin_only" ON public.settings
  FOR UPDATE TO authenticated USING (current_user_role() = 'Admin');
CREATE POLICY "settings_delete_admin_only" ON public.settings
  FOR DELETE TO authenticated USING (current_user_role() = 'Admin');

-- staff_shared: has staff_write_admin_only (ALL) + staff_select_own_or_admin (SELECT)
DROP POLICY IF EXISTS "staff_write_admin_only" ON public.staff_shared;
CREATE POLICY "staff_insert_admin_only" ON public.staff_shared
  FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'Admin');
CREATE POLICY "staff_update_admin_only" ON public.staff_shared
  FOR UPDATE TO authenticated USING (current_user_role() = 'Admin');
CREATE POLICY "staff_delete_admin_only" ON public.staff_shared
  FOR DELETE TO authenticated USING (current_user_role() = 'Admin');

-- ============================================
-- Pattern 3: Remove legacy public SELECT policies (keep authenticated versions)
-- ============================================

-- orders_bannos: drop "Anyone can view bannos orders" (public), keep orders_select_by_role (authenticated)
DROP POLICY IF EXISTS "Anyone can view bannos orders" ON public.orders_bannos;

-- orders_flourlane: drop "Anyone can view flourlane orders" (public), keep orders_select_by_role (authenticated)
DROP POLICY IF EXISTS "Anyone can view flourlane orders" ON public.orders_flourlane;

-- bom_items: drop "All can view bom items" (public), keep bom_items_select_authenticated
DROP POLICY IF EXISTS "All can view bom items" ON public.bom_items;

-- boms: drop "All can view boms" (public), keep boms_select_authenticated
DROP POLICY IF EXISTS "All can view boms" ON public.boms;

-- components: drop "Authenticated users can view components" - misleading name, actually targets public role
-- Keep components_select_authenticated which correctly targets authenticated role
DROP POLICY IF EXISTS "Authenticated users can view components" ON public.components;

-- order_photos: drop order_photos_select (public), keep order_photos_select_authenticated
DROP POLICY IF EXISTS "order_photos_select" ON public.order_photos;

-- orders: drop orders_select (public) - orders_modify_service_only covers service role access
-- Conditional: orders table may not exist in preview
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    DROP POLICY IF EXISTS "orders_select" ON public.orders;
  END IF;
END $$;

-- ============================================
-- Pattern 4: Consolidate public ALL + service policies
-- These are FOR ALL policies for service_role, which is fine but creates duplicates
-- ============================================

-- dead_letter: has dead_letter_service_only (public, ALL) - keep as-is, service role bypasses RLS anyway
-- work_queue: has work_queue_service_only (public, ALL) - keep as-is
-- order_photos: has order_photos_modify_service_only (public, ALL) - keep as-is
-- orders: has orders_modify_service_only (public, ALL) - keep as-is

-- Note: public ALL policies are for service_role which bypasses RLS anyway,
-- but they still show in the advisor. These are intentional for explicit documentation.
