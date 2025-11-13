-- Migration 067: Fix Production Status to Show Only Assigned Orders
-- Date: 2025-11-13
-- Purpose: Update get_queue_stats to count only assigned orders in stage counts
--
-- ISSUE:
-- Production Status cards show ALL orders in each stage (assigned + unassigned)
-- This is misleading - "Production Status" should show active work, not waiting work
--
-- FIX:
-- Add 'AND assignee_id IS NOT NULL' filter to stage count queries
-- Only count orders that have been assigned to staff (actually in production)
--
-- IMPACT:
-- - ProductionStatus component will show correct active work counts
-- - MetricCards "In Production" metric will show correct active work
-- - Dashboard displays will be more accurate
-- - No breaking changes (same return structure)

BEGIN;

-- ============================================================================
-- Update get_queue_stats RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_queue_stats(p_store text)
 RETURNS TABLE(
   total_orders bigint, 
   completed_orders bigint, 
   in_production bigint, 
   unassigned_orders bigint, 
   filling_count bigint, 
   covering_count bigint, 
   decorating_count bigint, 
   packing_count bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
BEGIN
  -- Validate store parameter to prevent SQL injection
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  v_table_name := 'orders_' || p_store;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      COUNT(*)::bigint as total_orders,
      COUNT(*) FILTER (WHERE stage = ''Complete'')::bigint as completed_orders,
      COUNT(*) FILTER (WHERE stage != ''Complete'')::bigint as in_production,
      COUNT(*) FILTER (WHERE assignee_id IS NULL AND stage != ''Complete'')::bigint as unassigned_orders,
      COUNT(*) FILTER (WHERE stage = ''Filling'' AND assignee_id IS NOT NULL)::bigint as filling_count,
      COUNT(*) FILTER (WHERE stage = ''Covering'' AND assignee_id IS NOT NULL)::bigint as covering_count,
      COUNT(*) FILTER (WHERE stage = ''Decorating'' AND assignee_id IS NOT NULL)::bigint as decorating_count,
      COUNT(*) FILTER (WHERE stage = ''Packing'' AND assignee_id IS NOT NULL)::bigint as packing_count
    FROM public.%I
  ', v_table_name);
END;
$function$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================

-- Test with Bannos store
-- SELECT * FROM get_queue_stats('bannos');
-- 
-- Expected results when all orders are unassigned:
-- - total_orders: 15
-- - completed_orders: 0
-- - in_production: 15
-- - unassigned_orders: 15
-- - filling_count: 0  (was 15 before - now correctly shows 0 assigned)
-- - covering_count: 0
-- - decorating_count: 0
-- - packing_count: 0

-- Test with Flourlane store
-- SELECT * FROM get_queue_stats('flourlane');
--
-- Expected results when all orders are unassigned:
-- - total_orders: 22
-- - completed_orders: 0
-- - in_production: 22
-- - unassigned_orders: 22
-- - filling_count: 0  (was 22 before - now correctly shows 0 assigned)
-- - covering_count: 0
-- - decorating_count: 0
-- - packing_count: 0

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback, restore original version:
-- CREATE OR REPLACE FUNCTION public.get_queue_stats(p_store text)
-- ... (remove 'AND assignee_id IS NOT NULL' from stage count filters)

