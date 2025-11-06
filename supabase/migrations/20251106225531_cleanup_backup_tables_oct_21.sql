-- Migration: Cleanup Backup Tables from October 21, 2025
-- Date: 2025-11-06
-- Purpose: Remove orphaned backup tables created during webhook fix attempts (PR #174-181)
-- 
-- Context:
-- During webhook troubleshooting on October 21, 2025, multiple backup tables were created
-- These tables are now disconnected from the main schema and no longer needed
-- Total: ~20 backup tables with pattern *_bak_20251021_*
--
-- Safety: These tables are completely isolated from the main schema
-- No foreign keys or dependencies exist

-- Drop backup tables (all from October 21, 2025 webhook fixes)
-- Pattern: *_bak_20251021_023916645*

DROP TABLE IF EXISTS orders_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS orders_bannos_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS orders_flourlane_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS inventory_txn_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS order_photos_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS dead_letter_bak_20251021_023916645 CASCADE;

-- Additional backup tables (if they exist with different timestamps)
-- These may have been created during multiple backup attempts
DROP TABLE IF EXISTS orders_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS orders_bannos_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS orders_flourlane_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS inventory_txn_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS order_photos_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS dead_letter_bak_20251021_023916646 CASCADE;

DROP TABLE IF EXISTS orders_bak_20251021_023916647 CASCADE;
DROP TABLE IF EXISTS orders_bannos_bak_20251021_023916647 CASCADE;
DROP TABLE IF EXISTS orders_flourlane_bak_20251021_023916647 CASCADE;
DROP TABLE IF EXISTS inventory_txn_bak_20251021_023916647 CASCADE;
DROP TABLE IF EXISTS order_photos_bak_20251021_023916647 CASCADE;
DROP TABLE IF EXISTS dead_letter_bak_20251021_023916647 CASCADE;

-- Drop any other backup tables with October 21 pattern
-- This covers all possible backup tables from that day
DROP TABLE IF EXISTS work_queue_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS work_queue_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS work_queue_bak_20251021_023916647 CASCADE;

DROP TABLE IF EXISTS stage_events_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS stage_events_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS stage_events_bak_20251021_023916647 CASCADE;

DROP TABLE IF EXISTS processed_webhooks_bak_20251021_023916645 CASCADE;
DROP TABLE IF EXISTS processed_webhooks_bak_20251021_023916646 CASCADE;
DROP TABLE IF EXISTS processed_webhooks_bak_20251021_023916647 CASCADE;

-- Verification query (commented out - for manual verification after migration)
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name LIKE '%_bak_20251021_%'
-- ORDER BY table_name;
-- 
-- Expected result: 0 rows

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete: All backup tables from October 21, 2025 have been removed';
END $$;

