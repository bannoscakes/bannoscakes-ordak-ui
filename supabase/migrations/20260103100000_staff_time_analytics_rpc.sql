-- Migration: Staff time analytics RPC
-- Purpose: Calculate avg time per stage per staff for productivity tracking

BEGIN;

-- =============================================================================
-- get_staff_time_analytics: Staff time metrics grouped by stage
-- Returns per-staff counts AND avg minutes for Filling, Covering, Decorating, Packing
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_staff_time_analytics(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  staff_id uuid,
  staff_name text,
  filling_count bigint,
  filling_avg_minutes numeric,
  covering_count bigint,
  covering_avg_minutes numeric,
  decorating_count bigint,
  decorating_avg_minutes numeric,
  packing_count bigint,
  packing_avg_minutes numeric,
  total_count bigint,
  total_time_minutes numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_start_ts timestamptz;
  v_role text;
  v_days integer;
BEGIN
  -- Permission check: only Supervisor or Admin (matches existing pattern)
  v_role := public.app_role();
  IF v_role NOT IN ('Supervisor', 'Admin') THEN
    RAISE EXCEPTION 'Access denied: requires Supervisor or Admin role';
  END IF;

  -- Clamp p_days to valid range (1-365)
  v_days := GREATEST(1, LEAST(COALESCE(p_days, 30), 365));
  v_start_ts := now() - (v_days || ' days')::interval;

  RETURN QUERY
  WITH stage_times AS (
    -- Get complete events with calculated duration from order timestamps (Bannos)
    SELECT
      se.staff_id,
      se.stage,
      CASE se.stage
        WHEN 'Filling' THEN EXTRACT(EPOCH FROM (o.filling_complete_ts - o.filling_start_ts)) / 60
        WHEN 'Covering' THEN EXTRACT(EPOCH FROM (o.covering_complete_ts - o.covering_start_ts)) / 60
        WHEN 'Decorating' THEN EXTRACT(EPOCH FROM (o.decorating_complete_ts - o.decorating_start_ts)) / 60
        WHEN 'Packing' THEN EXTRACT(EPOCH FROM (o.packing_complete_ts - o.packing_start_ts)) / 60
      END as duration_minutes
    FROM stage_events se
    JOIN orders_bannos o ON se.order_id = o.id
    WHERE se.event_type = 'complete'
      AND se.at_ts >= v_start_ts
      AND se.staff_id IS NOT NULL

    UNION ALL

    -- Get complete events with calculated duration from order timestamps (Flourlane)
    SELECT
      se.staff_id,
      se.stage,
      CASE se.stage
        WHEN 'Filling' THEN EXTRACT(EPOCH FROM (o.filling_complete_ts - o.filling_start_ts)) / 60
        WHEN 'Covering' THEN EXTRACT(EPOCH FROM (o.covering_complete_ts - o.covering_start_ts)) / 60
        WHEN 'Decorating' THEN EXTRACT(EPOCH FROM (o.decorating_complete_ts - o.decorating_start_ts)) / 60
        WHEN 'Packing' THEN EXTRACT(EPOCH FROM (o.packing_complete_ts - o.packing_start_ts)) / 60
      END as duration_minutes
    FROM stage_events se
    JOIN orders_flourlane o ON se.order_id = o.id
    WHERE se.event_type = 'complete'
      AND se.at_ts >= v_start_ts
      AND se.staff_id IS NOT NULL
  )
  SELECT
    st.staff_id,
    COALESCE(s.full_name, 'Unknown')::text as staff_name,
    COUNT(*) FILTER (WHERE st.stage = 'Filling')::bigint as filling_count,
    ROUND(AVG(st.duration_minutes) FILTER (WHERE st.stage = 'Filling'), 1) as filling_avg_minutes,
    COUNT(*) FILTER (WHERE st.stage = 'Covering')::bigint as covering_count,
    ROUND(AVG(st.duration_minutes) FILTER (WHERE st.stage = 'Covering'), 1) as covering_avg_minutes,
    COUNT(*) FILTER (WHERE st.stage = 'Decorating')::bigint as decorating_count,
    ROUND(AVG(st.duration_minutes) FILTER (WHERE st.stage = 'Decorating'), 1) as decorating_avg_minutes,
    COUNT(*) FILTER (WHERE st.stage = 'Packing')::bigint as packing_count,
    ROUND(AVG(st.duration_minutes) FILTER (WHERE st.stage = 'Packing'), 1) as packing_avg_minutes,
    COUNT(*)::bigint as total_count,
    ROUND(SUM(st.duration_minutes), 1) as total_time_minutes
  FROM stage_times st
  LEFT JOIN staff_shared s ON st.staff_id = s.user_id
  WHERE st.duration_minutes IS NOT NULL
    AND st.duration_minutes >= 0
  GROUP BY st.staff_id, s.full_name
  ORDER BY COUNT(*) DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_staff_time_analytics(integer) TO authenticated;

COMMENT ON FUNCTION public.get_staff_time_analytics(integer) IS
  'Returns staff time analytics: count and avg minutes per stage for the last N days';

COMMIT;
