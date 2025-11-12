-- Cleanup Remaining Backup Tables
-- These have slightly different timestamps than expected

-- First, let's see exactly what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_bak_20251021_%'
ORDER BY table_name;

-- Now drop them all dynamically
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE '%_bak_20251021_%'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_record.table_name);
        RAISE NOTICE 'Dropped table: %', table_record.table_name;
    END LOOP;
END $$;

-- Verify cleanup
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS: All backup tables removed'
    ELSE '⚠️ WARNING: ' || COUNT(*) || ' backup tables still exist'
  END as status,
  COALESCE(STRING_AGG(table_name, ', '), 'None') as remaining_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_bak_20251021_%';

