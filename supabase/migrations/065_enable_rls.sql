-- Migration 065: Enable Row Level Security (RLS) with Role-Based Access Control
-- Date: 2025-11-12
-- Task: Master_Task.md - Task 16: Enable RLS Policies
--
-- PURPOSE:
-- Add defense-in-depth security by enforcing role-based access at the database level.
-- Prevents unauthorized data access even if UI security is bypassed (developer console, etc).
--
-- SECURITY MODEL:
-- - Admin: Full access to all tables
-- - Supervisor: View/update orders, read-only settings
-- - Staff: View/update assigned orders only
-- - Service Role (Edge Functions): Automatically bypasses RLS
--
-- NOTES:
-- - Uses inline role checks for consistency with existing code (055, 058)
-- - SECURITY DEFINER RPCs still need RLS policies (they run as auth.uid())
-- - Staff UPDATE permission required for scanner RPCs to work

BEGIN;

-- ============================================================================
-- HELPER FUNCTIONS: Role checks - SECURITY DEFINER bypasses RLS
-- ============================================================================
-- These functions are CRITICAL to avoid infinite recursion in RLS policies.
-- They use SECURITY DEFINER to bypass RLS when checking user roles.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM staff_shared
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_user_role() IS 'Get current user role (SECURITY DEFINER bypasses RLS to prevent recursion)';

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Helper function to check if user is a participant in a conversation
-- Used by conversation_participants policy to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_conversation_participant(uuid) IS 'Check if current user is participant in conversation (SECURITY DEFINER bypasses RLS to prevent recursion)';

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated;

-- ============================================================================
-- CORE TABLES: orders_bannos, orders_flourlane
-- ============================================================================

-- Enable RLS
ALTER TABLE orders_bannos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_flourlane ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Admin/Supervisor see all, Staff see assigned only
CREATE POLICY "orders_select_by_role" ON orders_bannos
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('Admin', 'Supervisor')  -- Uses SECURITY DEFINER helper to avoid recursion
    OR assignee_id = auth.uid()
  );

CREATE POLICY "orders_select_by_role" ON orders_flourlane
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('Admin', 'Supervisor')  -- Uses SECURITY DEFINER helper to avoid recursion
    OR assignee_id = auth.uid()
  );

-- Policy 2: UPDATE - Admin/Supervisor can update all, Staff can update assigned
-- (Staff need this for scanner RPCs: complete_filling, complete_covering, etc)
CREATE POLICY "orders_update_by_role" ON orders_bannos
  FOR UPDATE TO authenticated
  USING (
    current_user_role() IN ('Admin', 'Supervisor')  -- Uses SECURITY DEFINER helper to avoid recursion
    OR assignee_id = auth.uid()
  );

CREATE POLICY "orders_update_by_role" ON orders_flourlane
  FOR UPDATE TO authenticated
  USING (
    current_user_role() IN ('Admin', 'Supervisor')  -- Uses SECURITY DEFINER helper to avoid recursion
    OR assignee_id = auth.uid()
  );

-- Policy 3: DELETE - Admin only
CREATE POLICY "orders_delete_admin_only" ON orders_bannos
  FOR DELETE TO authenticated
  USING (
    current_user_role() = 'Admin'  -- Uses SECURITY DEFINER helper to avoid recursion
  );

CREATE POLICY "orders_delete_admin_only" ON orders_flourlane
  FOR DELETE TO authenticated
  USING (
    current_user_role() = 'Admin'  -- Uses SECURITY DEFINER helper to avoid recursion
  );

-- Policy 4: INSERT - Block direct inserts (service role only via webhooks)
CREATE POLICY "orders_insert_service_only" ON orders_bannos
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "orders_insert_service_only" ON orders_flourlane
  FOR INSERT TO authenticated
  WITH CHECK (false);

COMMENT ON POLICY "orders_select_by_role" ON orders_bannos IS 'Admin/Supervisor see all orders, Staff see assigned only';
COMMENT ON POLICY "orders_update_by_role" ON orders_bannos IS 'Admin/Supervisor update all, Staff update assigned (scanner RPCs need this)';
COMMENT ON POLICY "orders_delete_admin_only" ON orders_bannos IS 'Only Admin can delete orders';
COMMENT ON POLICY "orders_insert_service_only" ON orders_bannos IS 'Block direct inserts, webhooks use service role';

-- ============================================================================
-- CRITICAL: settings (API tokens, Shopify credentials)
-- ============================================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin and Supervisor (read-only for Supervisor)
CREATE POLICY "settings_select_admin_supervisor" ON settings
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('Admin', 'Supervisor')
  );

-- UPDATE/DELETE/INSERT: Admin only
CREATE POLICY "settings_write_admin_only" ON settings
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'Admin'
  )
  WITH CHECK (
    current_user_role() = 'Admin'
  );

COMMENT ON POLICY "settings_select_admin_supervisor" ON settings IS 'Admin and Supervisor can read settings';
COMMENT ON POLICY "settings_write_admin_only" ON settings IS 'Only Admin can modify settings (API tokens protected)';

-- ============================================================================
-- CRITICAL: audit_log (tamper-proof audit trail) - if exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_log') THEN
    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

    -- SELECT: Admin only
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'audit_log' 
      AND policyname = 'audit_log_select_admin_only'
    ) THEN
      CREATE POLICY "audit_log_select_admin_only" ON audit_log
        FOR SELECT TO authenticated
        USING (
          current_user_role() = 'Admin'
        );
    END IF;

    -- INSERT: Authenticated users can log (RPCs use this)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'audit_log' 
      AND policyname = 'audit_log_insert_authenticated'
    ) THEN
      CREATE POLICY "audit_log_insert_authenticated" ON audit_log
        FOR INSERT TO authenticated
        WITH CHECK (true);
    END IF;

    -- UPDATE/DELETE: Blocked (audit logs are immutable)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'audit_log' 
      AND policyname = 'audit_log_no_modifications'
    ) THEN
      CREATE POLICY "audit_log_no_modifications" ON audit_log
        FOR UPDATE TO authenticated
        USING (false);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'audit_log' 
      AND policyname = 'audit_log_no_deletes'
    ) THEN
      CREATE POLICY "audit_log_no_deletes" ON audit_log
        FOR DELETE TO authenticated
        USING (false);
    END IF;
  END IF;
  
  -- Add comments if policies exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_select_admin_only') THEN
    COMMENT ON POLICY "audit_log_select_admin_only" ON audit_log IS 'Only Admin can read audit logs';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_insert_authenticated') THEN
    COMMENT ON POLICY "audit_log_insert_authenticated" ON audit_log IS 'RPCs can log actions';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_no_modifications') THEN
    COMMENT ON POLICY "audit_log_no_modifications" ON audit_log IS 'Audit logs are immutable (no updates)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_no_deletes') THEN
    COMMENT ON POLICY "audit_log_no_deletes" ON audit_log IS 'Audit logs cannot be deleted (tamper-proof)';
  END IF;
END $$;

-- ============================================================================
-- staff_shared (user records)
-- ============================================================================

-- RLS already enabled in migration 20251008214500_fix_staff_shared_dependency.sql
-- But need to fix conflicting policy

-- Drop old conflicting policy (allows all authenticated users to view)
DROP POLICY IF EXISTS "Users can view staff_shared" ON staff_shared;

-- New policies: Users see own record, Admin sees all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'staff_shared' 
    AND policyname = 'staff_select_own_or_admin'
  ) THEN
    CREATE POLICY "staff_select_own_or_admin" ON staff_shared
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()  -- Users can see their own record
        OR EXISTS (
          SELECT 1 FROM staff_shared 
          WHERE user_id = auth.uid() 
          AND role = 'Admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'staff_shared' 
    AND policyname = 'staff_write_admin_only'
  ) THEN
    CREATE POLICY "staff_write_admin_only" ON staff_shared
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM staff_shared 
          WHERE user_id = auth.uid() 
          AND role = 'Admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM staff_shared 
          WHERE user_id = auth.uid() 
          AND role = 'Admin'
        )
      );
  END IF;
END $$;

COMMENT ON POLICY "staff_select_own_or_admin" ON staff_shared IS 'Users see own record, Admin sees all';
COMMENT ON POLICY "staff_write_admin_only" ON staff_shared IS 'Only Admin can modify user accounts';

-- ============================================================================
-- SYSTEM TABLES: webhook_inbox_*, shopify_sync_runs
-- ============================================================================

-- webhook_inbox_bannos
ALTER TABLE webhook_inbox_bannos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_inbox_bannos_admin_only" ON webhook_inbox_bannos
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'Admin'
  );

CREATE POLICY "webhook_inbox_bannos_no_direct_writes" ON webhook_inbox_bannos
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- webhook_inbox_flourlane
ALTER TABLE webhook_inbox_flourlane ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_inbox_flourlane_admin_only" ON webhook_inbox_flourlane
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'Admin'
  );

CREATE POLICY "webhook_inbox_flourlane_no_direct_writes" ON webhook_inbox_flourlane
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- shopify_sync_runs
ALTER TABLE shopify_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_sync_runs_admin_only" ON shopify_sync_runs
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'Admin'
  );

CREATE POLICY "shopify_sync_runs_no_direct_writes" ON shopify_sync_runs
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "webhook_inbox_bannos_admin_only" ON webhook_inbox_bannos IS 'Only Admin can view webhook inbox (debugging)';
COMMENT ON POLICY "shopify_sync_runs_admin_only" ON shopify_sync_runs IS 'Only Admin can view sync history';

-- ============================================================================
-- INVENTORY TABLES: boms, bom_items
-- ============================================================================

-- boms
ALTER TABLE boms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boms_select_authenticated" ON boms
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "boms_write_admin_only" ON boms
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'Admin'
  )
  WITH CHECK (
    current_user_role() = 'Admin'
  );

-- bom_items
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bom_items_select_authenticated" ON bom_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "bom_items_write_admin_only" ON bom_items
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'Admin'
  )
  WITH CHECK (
    current_user_role() = 'Admin'
  );

COMMENT ON POLICY "boms_select_authenticated" ON boms IS 'All authenticated users can view BOMs';
COMMENT ON POLICY "boms_write_admin_only" ON boms IS 'Only Admin can modify BOMs';

-- ============================================================================
-- MESSAGING TABLES (if they exist)
-- ============================================================================

-- conversations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
    
    -- Users can see conversations they're participants in
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'conversations' 
      AND policyname = 'conversations_select_participants'
    ) THEN
      CREATE POLICY "conversations_select_participants" ON conversations
        FOR SELECT TO authenticated
        USING (
          created_by = auth.uid()
          OR is_conversation_participant(conversations.id)  -- Uses SECURITY DEFINER helper to avoid recursion
          OR current_user_role() = 'Admin'
        );
    END IF;
  END IF;
END $$;

-- messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    
    -- Users can see messages in conversations they're participants in
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'messages' 
      AND policyname = 'messages_select_participants'
    ) THEN
      CREATE POLICY "messages_select_participants" ON messages
        FOR SELECT TO authenticated
        USING (
          sender_id = auth.uid()
          OR is_conversation_participant(messages.conversation_id)  -- Uses SECURITY DEFINER helper to avoid recursion
          OR current_user_role() = 'Admin'
        );
    END IF;
  END IF;
END $$;

-- conversation_participants (CRITICAL - prevents participant enumeration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_participants') THEN
    ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
    
    -- Users can only see participants in conversations they're part of
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'conversation_participants' 
      AND policyname = 'conversation_participants_select_own'
    ) THEN
      CREATE POLICY "conversation_participants_select_own" ON conversation_participants
        FOR SELECT TO authenticated
        USING (
          user_id = auth.uid()  -- Can see their own participation records
          OR is_conversation_participant(conversation_participants.conversation_id)  -- Uses SECURITY DEFINER helper to avoid recursion
          OR current_user_role() = 'Admin'
        );
    END IF;
    
    -- Block direct writes (managed by RPCs)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'conversation_participants' 
      AND policyname = 'conversation_participants_no_direct_writes'
    ) THEN
      CREATE POLICY "conversation_participants_no_direct_writes" ON conversation_participants
        FOR ALL TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

-- message_reads (CRITICAL - prevents read status enumeration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_reads') THEN
    ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
    
    -- Users can only see read status for conversations they're part of
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'message_reads' 
      AND policyname = 'message_reads_select_participants'
    ) THEN
      CREATE POLICY "message_reads_select_participants" ON message_reads
        FOR SELECT TO authenticated
        USING (
          user_id = auth.uid()  -- Can see their own read status
          OR is_conversation_participant(message_reads.conversation_id)  -- Uses SECURITY DEFINER helper to avoid recursion
          OR current_user_role() = 'Admin'
        );
    END IF;
    
    -- Block direct writes (managed by RPCs)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'message_reads' 
      AND policyname = 'message_reads_no_direct_writes'
    ) THEN
      CREATE POLICY "message_reads_no_direct_writes" ON message_reads
        FOR ALL TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- COMPONENTS TABLE (if exists - old name for inventory_items)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'components') THEN
    ALTER TABLE components ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'components' 
      AND policyname = 'components_select_authenticated'
    ) THEN
      CREATE POLICY "components_select_authenticated" ON components
        FOR SELECT TO authenticated
        USING (true);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'components' 
      AND policyname = 'components_write_admin_only'
    ) THEN
      CREATE POLICY "components_write_admin_only" ON components
        FOR ALL TO authenticated
        USING (
          current_user_role() = 'Admin'
        )
        WITH CHECK (
          current_user_role() = 'Admin'
        );
    END IF;
  END IF;
END $$;

-- ============================================================================
-- ORDER_PHOTOS TABLE (if exists - Task 14)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_photos') THEN
    ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'order_photos' 
      AND policyname = 'order_photos_select_authenticated'
    ) THEN
      CREATE POLICY "order_photos_select_authenticated" ON order_photos
        FOR SELECT TO authenticated
        USING (true);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'order_photos' 
      AND policyname = 'order_photos_write_via_rpc'
    ) THEN
      CREATE POLICY "order_photos_write_via_rpc" ON order_photos
        FOR ALL TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================

-- Check RLS is enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check policies created
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Test queries (run as different roles to verify)
-- Admin: SELECT * FROM orders_bannos; -- Should see all
-- Supervisor: SELECT * FROM orders_bannos; -- Should see all
-- Staff: SELECT * FROM orders_bannos; -- Should see assigned only
-- Staff: SELECT * FROM settings; -- Should see empty (blocked)

