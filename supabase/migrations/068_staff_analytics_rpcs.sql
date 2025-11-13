-- Migration 068: Staff Analytics RPCs
-- Date: 2025-11-13
-- Purpose: Add RPCs for Staff Analytics metrics (Attendance Rate, Avg Productivity)
--
-- ATTENDANCE RATE:
-- Calculates attendance rate from shifts table (last 30 days)
-- Formula: (staff with completed shifts) / (total active staff) * 100
--
-- AVG PRODUCTIVITY:
-- Calculates average productivity from barcode scan timestamps
-- Formula: Average time between stage completions (filling -> covering -> decorating -> packing)
-- Based on timestamps: filling_complete_ts, covering_complete_ts, decorating_complete_ts, packing_complete_ts

BEGIN;

-- ============================================================================
-- RPC 1: get_staff_attendance_rate
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_attendance_rate(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  attendance_rate numeric,
  total_staff integer,
  staff_with_shifts integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH active_staff AS (
    SELECT COUNT(*)::integer as total
    FROM staff_shared
    WHERE is_active = true
  ),
  staff_with_shifts AS (
    SELECT COUNT(DISTINCT s.user_id)::integer as count
    FROM staff_shared s
    INNER JOIN shifts sh ON sh.staff_id = s.user_id
    WHERE s.is_active = true
      AND sh.start_ts >= (now() - (p_days || ' days')::interval)
      AND sh.end_ts IS NOT NULL  -- Only count completed shifts
  )
  SELECT 
    CASE 
      WHEN (SELECT total FROM active_staff) > 0 THEN
        ROUND(
          ((SELECT count FROM staff_with_shifts)::numeric / (SELECT total FROM active_staff)::numeric) * 100,
          1
        )
      ELSE 0::numeric
    END as attendance_rate,
    (SELECT total FROM active_staff) as total_staff,
    (SELECT count FROM staff_with_shifts) as staff_with_shifts;
END;
$function$;

-- ============================================================================
-- RPC 2: get_staff_avg_productivity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_avg_productivity(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  avg_productivity numeric,
  total_orders_completed integer,
  avg_time_per_order_minutes numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH completed_orders AS (
    -- Get orders completed in the last p_days
    SELECT 
      id,
      store,
      filling_start_ts,
      filling_complete_ts,
      covering_complete_ts,
      decorating_complete_ts,
      packing_start_ts,
      packing_complete_ts
    FROM (
      SELECT 
        id,
        'bannos'::text as store,
        filling_start_ts,
        filling_complete_ts,
        covering_complete_ts,
        decorating_complete_ts,
        packing_start_ts,
        packing_complete_ts
      FROM orders_bannos
      WHERE stage = 'Complete'
        AND packing_complete_ts >= (now() - (p_days || ' days')::interval)
      
      UNION ALL
      
      SELECT 
        id,
        'flourlane'::text as store,
        filling_start_ts,
        filling_complete_ts,
        covering_complete_ts,
        decorating_complete_ts,
        packing_start_ts,
        packing_complete_ts
      FROM orders_flourlane
      WHERE stage = 'Complete'
        AND packing_complete_ts >= (now() - (p_days || ' days')::interval)
    ) all_orders
    WHERE packing_complete_ts IS NOT NULL
      AND filling_start_ts IS NOT NULL
  ),
  order_times AS (
    SELECT 
      id,
      -- Calculate total time from filling start to packing complete (in minutes)
      EXTRACT(EPOCH FROM (packing_complete_ts - filling_start_ts)) / 60 as total_minutes
    FROM completed_orders
    WHERE packing_complete_ts IS NOT NULL
      AND filling_start_ts IS NOT NULL
  )
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN
        -- Productivity: inverse of time (faster = higher productivity)
        -- Normalize to 0-100 scale: assume 2 hours (120 min) = 100%, scale accordingly
        -- Formula: (120 - avg_time) / 120 * 100, clamped to 0-100
        LEAST(100, GREATEST(0, 
          ROUND(
            ((120 - COALESCE(AVG(total_minutes), 120)) / 120) * 100,
            1
          )
        ))
      ELSE 0::numeric
    END as avg_productivity,
    COUNT(*)::integer as total_orders_completed,
    ROUND(COALESCE(AVG(total_minutes), 0), 1) as avg_time_per_order_minutes
  FROM order_times;
END;
$function$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_staff_attendance_rate(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_avg_productivity(integer) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_staff_attendance_rate IS 'Calculate attendance rate from shifts (last N days). Returns percentage of active staff who have completed shifts.';
COMMENT ON FUNCTION public.get_staff_avg_productivity IS 'Calculate average productivity from barcode scan timestamps. Based on time from filling_start to packing_complete. Returns 0-100 scale.';

-- ============================================================================
-- RPC 3: get_department_performance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_department_performance(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  department text,
  members integer,
  efficiency numeric,
  satisfaction numeric,
  color text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH store_staff AS (
    -- Count staff by store (bannos, flourlane, both)
    SELECT 
      store,
      COUNT(*)::integer as staff_count
    FROM staff_shared
    WHERE is_active = true
      AND store IN ('bannos', 'flourlane', 'both')
    GROUP BY store
  ),
  store_efficiency AS (
    -- Calculate efficiency from order completion times per store
    SELECT 
      'bannos'::text as store_name,
      CASE 
        WHEN COUNT(*) > 0 THEN
          LEAST(100, GREATEST(0, 
            ROUND(
              ((120 - COALESCE(AVG(EXTRACT(EPOCH FROM (packing_complete_ts - filling_start_ts)) / 60), 120)) / 120) * 100,
              1
            )
          ))
        ELSE 0::numeric
      END as eff
    FROM orders_bannos
    WHERE stage = 'Complete'
      AND packing_complete_ts >= (now() - (p_days || ' days')::interval)
      AND filling_start_ts IS NOT NULL
      AND packing_complete_ts IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'flourlane'::text as store_name,
      CASE 
        WHEN COUNT(*) > 0 THEN
          LEAST(100, GREATEST(0, 
            ROUND(
              ((120 - COALESCE(AVG(EXTRACT(EPOCH FROM (packing_complete_ts - filling_start_ts)) / 60), 120)) / 120) * 100,
              1
            )
          ))
        ELSE 0::numeric
      END as eff
    FROM orders_flourlane
    WHERE stage = 'Complete'
      AND packing_complete_ts >= (now() - (p_days || ' days')::interval)
      AND filling_start_ts IS NOT NULL
      AND packing_complete_ts IS NOT NULL
  ),
  combined_data AS (
    -- Bannos Production (bannos + both stores)
    SELECT 
      'Bannos Production'::text as department,
      (
        COALESCE((SELECT staff_count FROM store_staff WHERE store = 'bannos'), 0) +
        COALESCE((SELECT staff_count FROM store_staff WHERE store = 'both'), 0)
      )::integer as members,
      COALESCE((SELECT eff FROM store_efficiency WHERE store_name = 'bannos'), 0::numeric) as efficiency,
      0::numeric as satisfaction,  -- Satisfaction not tracked - show 0
      '#3b82f6'::text as color
    
    UNION ALL
    
    -- Flourlane Production (flourlane + both stores)
    SELECT 
      'Flourlane Production'::text as department,
      (
        COALESCE((SELECT staff_count FROM store_staff WHERE store = 'flourlane'), 0) +
        COALESCE((SELECT staff_count FROM store_staff WHERE store = 'both'), 0)
      )::integer as members,
      COALESCE((SELECT eff FROM store_efficiency WHERE store_name = 'flourlane'), 0::numeric) as efficiency,
      0::numeric as satisfaction,  -- Satisfaction not tracked - show 0
      '#ec4899'::text as color
  )
  SELECT 
    department,
    members,
    efficiency,
    satisfaction,
    color
  FROM combined_data
  WHERE members > 0  -- Only show departments with staff
  ORDER BY department;
END;
$function$;

-- ============================================================================
-- GRANTS (updated)
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_department_performance(integer) TO authenticated;

-- ============================================================================
-- COMMENTS (updated)
-- ============================================================================

COMMENT ON FUNCTION public.get_department_performance IS 'Get department performance by store. Calculates efficiency from order completion times. Returns Bannos Production and Flourlane Production based on staff.store field.';

COMMIT;

