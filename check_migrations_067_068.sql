-- ============================================================================
-- Check if Migrations 067 and 068 are Applied
-- ============================================================================
-- Run this in your Supabase SQL Editor to verify if the migrations are applied
-- ============================================================================

-- Check Migration 067: get_queue_stats (should have assignee_id IS NOT NULL filters)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND p.proname = 'get_queue_stats'
    ) THEN '✅ Migration 067: get_queue_stats function EXISTS'
    ELSE '❌ Migration 067: get_queue_stats function MISSING'
  END as migration_067_status;

-- Check Migration 068: get_staff_attendance_rate
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND p.proname = 'get_staff_attendance_rate'
    ) THEN '✅ Migration 068: get_staff_attendance_rate function EXISTS'
    ELSE '❌ Migration 068: get_staff_attendance_rate function MISSING'
  END as migration_068_attendance;

-- Check Migration 068: get_staff_avg_productivity
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND p.proname = 'get_staff_avg_productivity'
    ) THEN '✅ Migration 068: get_staff_avg_productivity function EXISTS'
    ELSE '❌ Migration 068: get_staff_avg_productivity function MISSING'
  END as migration_068_productivity;

-- Check Migration 068: get_department_performance
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND p.proname = 'get_department_performance'
    ) THEN '✅ Migration 068: get_department_performance function EXISTS'
    ELSE '❌ Migration 068: get_department_performance function MISSING'
  END as migration_068_department;

-- Check Migration 068: get_store_production_efficiency
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND p.proname = 'get_store_production_efficiency'
    ) THEN '✅ Migration 068: get_store_production_efficiency function EXISTS'
    ELSE '❌ Migration 068: get_store_production_efficiency function MISSING'
  END as migration_068_efficiency;

-- ============================================================================
-- Detailed Check: Verify get_queue_stats has the correct filters (Migration 067)
-- ============================================================================
-- This checks if the function definition includes 'assignee_id IS NOT NULL'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_get_functiondef(p.oid) AS func_def ON true
      WHERE n.nspname = 'public' 
        AND p.proname = 'get_queue_stats'
        AND func_def::text LIKE '%assignee_id IS NOT NULL%'
    ) THEN '✅ Migration 067: get_queue_stats has correct assignee_id filters'
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND p.proname = 'get_queue_stats'
    ) THEN '⚠️ Migration 067: get_queue_stats exists but may not have assignee_id filters'
    ELSE '❌ Migration 067: get_queue_stats function MISSING'
  END as migration_067_detailed_check;

-- ============================================================================
-- Summary: List all functions from migrations 067 and 068
-- ============================================================================
SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.proname = 'get_queue_stats' THEN 'Migration 067'
    WHEN p.proname IN (
      'get_staff_attendance_rate',
      'get_staff_avg_productivity', 
      'get_department_performance',
      'get_store_production_efficiency'
    ) THEN 'Migration 068'
    ELSE 'Other'
  END as migration_source,
  pg_get_function_identity_arguments(p.oid) as function_arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'get_queue_stats',
    'get_staff_attendance_rate',
    'get_staff_avg_productivity',
    'get_department_performance',
    'get_store_production_efficiency'
  )
ORDER BY 
  CASE 
    WHEN p.proname = 'get_queue_stats' THEN 1
    ELSE 2
  END,
  p.proname;

