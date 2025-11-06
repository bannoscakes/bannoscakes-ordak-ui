-- Database Cleanup Script
-- Purpose: Remove backup tables created during webhook fixes (October 21, 2025)
-- Date: 2025-11-06
-- IMPORTANT: Review this script before running. These are DROP commands.

-- ============================================================================
-- BACKUP TABLES TO DELETE
-- These were created during webhook fix attempts and are no longer needed
-- ============================================================================

-- Check what backup tables exist first
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_bak_%'
ORDER BY table_name;

-- Uncomment the following DROP statements after verifying the list above:

-- DROP TABLE IF EXISTS orders_bak_20251021_023916645 CASCADE;
-- DROP TABLE IF EXISTS orders_bannos_bak_20251021_023916645 CASCADE;
-- DROP TABLE IF EXISTS orders_flourlane_bak_20251021_023916645 CASCADE;
-- DROP TABLE IF EXISTS inventory_txn_bak_20251021_023916645 CASCADE;
-- DROP TABLE IF EXISTS order_photos_bak_20251021_023916645 CASCADE;
-- DROP TABLE IF EXISTS dead_letter_bak_20251021_023916645 CASCADE;

-- Add any other backup tables found in the SELECT query above

-- ============================================================================
-- VERIFICATION
-- After running DROP commands, verify they're gone:
-- ============================================================================

SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_bak_%';

-- Should return 0 rows if cleanup is complete

