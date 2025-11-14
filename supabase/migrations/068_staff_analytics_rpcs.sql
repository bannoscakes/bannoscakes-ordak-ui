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
        -- Formula: (120 / avg_time) * 100, clamped to 0-100
        -- When avg_time = 120 min → 100% productivity
        -- When avg_time = 60 min → 200% (capped at 100%)
        -- When avg_time = 240 min → 50% productivity
        LEAST(100, GREATEST(0, 
          ROUND(
            (120.0 / NULLIF(COALESCE(AVG(total_minutes), 120), 0)) * 100,
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
    -- Formula: (120 / avg_time) * 100, where 120 min = 100% productivity
    SELECT 
      'bannos'::text as store_name,
      CASE 
        WHEN COUNT(*) > 0 THEN
          LEAST(100, GREATEST(0, 
            ROUND(
              (120.0 / NULLIF(COALESCE(AVG(EXTRACT(EPOCH FROM (packing_complete_ts - filling_start_ts)) / 60), 120), 0)) * 100,
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
              (120.0 / NULLIF(COALESCE(AVG(EXTRACT(EPOCH FROM (packing_complete_ts - filling_start_ts)) / 60), 120), 0)) * 100,
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
    -- Bannos Production (bannos store only - 'both' staff counted separately to avoid double-counting)
    SELECT 
      'Bannos Production'::text as department,
      COALESCE((SELECT staff_count FROM store_staff WHERE store = 'bannos'), 0)::integer as members,
      COALESCE((SELECT eff FROM store_efficiency WHERE store_name = 'bannos'), 0::numeric) as efficiency,
      0::numeric as satisfaction,  -- Satisfaction not tracked - show 0
      '#3b82f6'::text as color
    
    UNION ALL
    
    -- Flourlane Production (flourlane store only - 'both' staff counted separately to avoid double-counting)
    SELECT 
      'Flourlane Production'::text as department,
      COALESCE((SELECT staff_count FROM store_staff WHERE store = 'flourlane'), 0)::integer as members,
      COALESCE((SELECT eff FROM store_efficiency WHERE store_name = 'flourlane'), 0::numeric) as efficiency,
      0::numeric as satisfaction,  -- Satisfaction not tracked - show 0
      '#ec4899'::text as color
    
    UNION ALL
    
    -- Both Stores (staff who work at both stores - counted once to avoid double-counting)
    SELECT 
      'Both Stores'::text as department,
      COALESCE((SELECT staff_count FROM store_staff WHERE store = 'both'), 0)::integer as members,
      -- Average efficiency across both stores
      COALESCE((
        SELECT AVG(eff) 
        FROM store_efficiency
      ), 0::numeric) as efficiency,
      0::numeric as satisfaction,  -- Satisfaction not tracked - show 0
      '#8b5cf6'::text as color
  )
  SELECT 
    combined_data.department,
    combined_data.members,
    combined_data.efficiency,
    combined_data.satisfaction,
    combined_data.color
  FROM combined_data
  WHERE combined_data.members > 0  -- Only show departments with staff
  ORDER BY combined_data.department;
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

-- ============================================================================
-- RPC 4: get_store_production_efficiency
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_store_production_efficiency(
  p_store text,
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  station text,
  efficiency numeric,
  target numeric,
  output bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_table_name text;
BEGIN
  -- Validate store parameter
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %. Must be bannos or flourlane', p_store;
  END IF;
  
  v_table_name := 'orders_' || p_store;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      station,
      efficiency,
      target,
      output
    FROM (
      SELECT 
        ''Filling''::text as station,
        CASE 
          WHEN COUNT(*) > 0 THEN
            -- Formula: (target_time / avg_time) * 100, where target_time = 100% efficiency
            -- When avg_time = 30 min → 100% efficiency
            -- When avg_time = 15 min → 200% (capped at 100%)
            -- When avg_time = 60 min → 50% efficiency
            LEAST(100, GREATEST(0, 
              ROUND(
                (30.0 / NULLIF(COALESCE(AVG(EXTRACT(EPOCH FROM (filling_complete_ts - filling_start_ts)) / 60), 30), 0)) * 100,
                1
              )
            ))
          ELSE 0::numeric
        END as efficiency,
        90::numeric as target,  -- Default target: 90%
        COUNT(*)::bigint as output
      FROM public.%I
      WHERE filling_start_ts IS NOT NULL
        AND filling_complete_ts IS NOT NULL
        AND filling_complete_ts >= (now() - (%L || '' days'')::interval)
      
      UNION ALL
      
      SELECT 
        ''Covering''::text as station,
        CASE 
          WHEN COUNT(*) > 0 THEN
            LEAST(100, GREATEST(0, 
              ROUND(
                (25.0 / NULLIF(COALESCE(AVG(EXTRACT(EPOCH FROM (covering_complete_ts - filling_complete_ts)) / 60), 25), 0)) * 100,
                1
              )
            ))
          ELSE 0::numeric
        END as efficiency,
        88::numeric as target,
        COUNT(*)::bigint as output
      FROM public.%I
      WHERE filling_complete_ts IS NOT NULL
        AND covering_complete_ts IS NOT NULL
        AND covering_complete_ts >= (now() - (%L || '' days'')::interval)
      
      UNION ALL
      
      SELECT 
        ''Decoration''::text as station,
        CASE 
          WHEN COUNT(*) > 0 THEN
            LEAST(100, GREATEST(0, 
              ROUND(
                (35.0 / NULLIF(COALESCE(AVG(EXTRACT(EPOCH FROM (decorating_complete_ts - covering_complete_ts)) / 60), 35), 0)) * 100,
                1
              )
            ))
          ELSE 0::numeric
        END as efficiency,
        85::numeric as target,
        COUNT(*)::bigint as output
      FROM public.%I
      WHERE covering_complete_ts IS NOT NULL
        AND decorating_complete_ts IS NOT NULL
        AND decorating_complete_ts >= (now() - (%L || '' days'')::interval)
      
      UNION ALL
      
      SELECT 
        ''Packing''::text as station,
        CASE 
          WHEN COUNT(*) > 0 THEN
            LEAST(100, GREATEST(0, 
              ROUND(
                (20.0 / NULLIF(COALESCE(AVG(EXTRACT(EPOCH FROM (packing_complete_ts - packing_start_ts)) / 60), 20), 0)) * 100,
                1
              )
            ))
          ELSE 0::numeric
        END as efficiency,
        92::numeric as target,
        COUNT(*)::bigint as output
      FROM public.%I
      WHERE packing_start_ts IS NOT NULL
        AND packing_complete_ts IS NOT NULL
        AND packing_complete_ts >= (now() - (%L || '' days'')::interval)
    ) all_stations
    ORDER BY 
      CASE station
        WHEN ''Filling'' THEN 1
        WHEN ''Covering'' THEN 2
        WHEN ''Decoration'' THEN 3
        WHEN ''Packing'' THEN 4
      END;
  ', v_table_name, p_days, v_table_name, p_days, v_table_name, p_days, v_table_name, p_days);
END;
$function$;

-- ============================================================================
-- GRANTS (updated)
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_store_production_efficiency(text, integer) TO authenticated;

-- ============================================================================
-- COMMENTS (updated)
-- ============================================================================

COMMENT ON FUNCTION public.get_store_production_efficiency IS 'Get production station efficiency for a store. Calculates efficiency from stage completion times. Returns Filling, Covering, Decoration, Packing with efficiency %, target %, and output count.';

COMMIT;

