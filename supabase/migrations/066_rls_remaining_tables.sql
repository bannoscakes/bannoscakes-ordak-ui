-- Migration 066: Enable RLS on Remaining Tables
-- Date: 2025-11-12
-- Purpose: Complete RLS coverage by enabling on remaining system tables
--
-- TABLES COVERED:
-- - component_txns (inventory transactions)
-- - processed_webhooks (webhook idempotency)
-- - users (if exists - may be auth.users)
-- - dead_letter (webhook failures)
-- - work_queue (background jobs)
--
-- SECURITY MODEL:
-- - Admin: Full access to all system tables
-- - Supervisor/Staff: No access to system tables (internal use only)
-- - Service Role: Bypasses RLS (Edge Functions, background workers)

BEGIN;

-- ============================================================================
-- COMPONENT_TXNS (Inventory Transaction History)
-- ============================================================================
-- Note: This table may already have RLS from migration 058

DO $$
BEGIN
  -- Check if table exists and RLS not already fully configured
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'component_txns') THEN
    
    -- Enable RLS if not already enabled
    ALTER TABLE component_txns ENABLE ROW LEVEL SECURITY;
    
    -- Grant table permissions
    EXECUTE 'GRANT SELECT ON component_txns TO authenticated';
    
    -- SELECT: Admin only (transaction history is sensitive)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'component_txns' 
      AND policyname = 'component_txns_select_admin_only'
    ) THEN
      CREATE POLICY "component_txns_select_admin_only" ON component_txns
        FOR SELECT TO authenticated
        USING (
          current_user_role() = 'Admin'
        );
    END IF;
    
    -- Block direct writes (managed by inventory RPCs)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'component_txns' 
      AND policyname = 'component_txns_no_direct_writes'
    ) THEN
      CREATE POLICY "component_txns_no_direct_writes" ON component_txns
        FOR ALL TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PROCESSED_WEBHOOKS (Webhook Idempotency Tracking)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'processed_webhooks') THEN
    
    ALTER TABLE processed_webhooks ENABLE ROW LEVEL SECURITY;
    
    -- Grant table permissions
    EXECUTE 'GRANT SELECT ON processed_webhooks TO authenticated';
    
    -- SELECT: Admin only (webhook debugging)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'processed_webhooks' 
      AND policyname = 'processed_webhooks_admin_only'
    ) THEN
      CREATE POLICY "processed_webhooks_admin_only" ON processed_webhooks
        FOR SELECT TO authenticated
        USING (
          current_user_role() = 'Admin'
        );
    END IF;
    
    -- Block direct writes (service role only)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'processed_webhooks' 
      AND policyname = 'processed_webhooks_no_direct_writes'
    ) THEN
      CREATE POLICY "processed_webhooks_no_direct_writes" ON processed_webhooks
        FOR ALL TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- DEAD_LETTER (Failed Webhook Queue)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dead_letter') THEN
    
    ALTER TABLE dead_letter ENABLE ROW LEVEL SECURITY;
    
    -- Grant table permissions
    EXECUTE 'GRANT SELECT ON dead_letter TO authenticated';
    
    -- SELECT: Admin only (error investigation)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'dead_letter' 
      AND policyname = 'dead_letter_admin_only'
    ) THEN
      CREATE POLICY "dead_letter_admin_only" ON dead_letter
        FOR SELECT TO authenticated
        USING (
          current_user_role() = 'Admin'
        );
    END IF;
    
    -- Block direct writes (service role only)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'dead_letter' 
      AND policyname = 'dead_letter_no_direct_writes'
    ) THEN
      CREATE POLICY "dead_letter_no_direct_writes" ON dead_letter
        FOR ALL TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- WORK_QUEUE (Background Job Queue)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'work_queue') THEN
    
    ALTER TABLE work_queue ENABLE ROW LEVEL SECURITY;
    
    -- Grant table permissions
    EXECUTE 'GRANT SELECT ON work_queue TO authenticated';
    
    -- SELECT: Admin only (job monitoring)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'work_queue' 
      AND policyname = 'work_queue_admin_only'
    ) THEN
      CREATE POLICY "work_queue_admin_only" ON work_queue
        FOR SELECT TO authenticated
        USING (
          current_user_role() = 'Admin'
        );
    END IF;
    
    -- Block direct writes (service role only)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'work_queue' 
      AND policyname = 'work_queue_no_direct_writes'
    ) THEN
      CREATE POLICY "work_queue_no_direct_writes" ON work_queue
        FOR ALL TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- USERS TABLE (if exists - may be different from auth.users)
-- ============================================================================
-- Note: auth.users is managed by Supabase Auth and has its own RLS
-- This only handles a custom "users" table if it exists in public schema

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    
    -- Grant table permissions
    EXECUTE 'GRANT SELECT ON users TO authenticated';
    
    -- Users see own record, Admin sees all
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND policyname = 'users_select_own_or_admin'
    ) THEN
      CREATE POLICY "users_select_own_or_admin" ON users
        FOR SELECT TO authenticated
        USING (
          id = auth.uid()
          OR current_user_role() = 'Admin'
        );
    END IF;
    
    -- Block direct writes (Admin only)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND policyname = 'users_write_admin_only'
    ) THEN
      CREATE POLICY "users_write_admin_only" ON users
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

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================

-- Check RLS is now enabled on all remaining tables
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('component_txns', 'processed_webhooks', 'dead_letter', 'work_queue', 'users')
-- ORDER BY tablename;

-- Check all public tables now have RLS enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND table_type = 'BASE TABLE'
-- ORDER BY rowsecurity DESC, tablename;

-- Verify no more "RLS Disabled" warnings in Supabase Studio Advisor

