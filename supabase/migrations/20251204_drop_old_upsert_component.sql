-- ============================================================================
-- Drop old upsert_component before 20251205 migration
-- This ensures only ONE version exists when 20251205 tries to add COMMENT
-- ============================================================================

-- Drop any existing versions of upsert_component
-- This prevents "function name not unique" errors when 20251205 adds COMMENT
DROP FUNCTION IF EXISTS public.upsert_component CASCADE;

-- Migration 20251205_fix_all_inventory_audit_log.sql will recreate it
-- Then 20251206_create_simplified_upsert_component.sql will replace it with simplified version
