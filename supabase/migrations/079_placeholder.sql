-- ============================================================================
-- Placeholder migration (079)
-- This file exists to maintain migration continuity after being renamed to
-- 20251206_create_simplified_upsert_component.sql
--
-- Previously this was 079_create_simplified_upsert_component.sql but was
-- renamed to use a timestamp to ensure it runs AFTER 20251205.
-- This placeholder prevents "Remote migration versions not found" errors.
-- ============================================================================

-- No operations needed - actual work is done in 20251206_create_simplified_upsert_component.sql
SELECT 'Migration 079 is a placeholder. See 20251206_create_simplified_upsert_component.sql for actual changes.' AS notice;
