-- Migration: Staff stage performance RPC
-- Purpose: Get staff performance breakdown by stage for analytics

BEGIN;

-- =============================================================================
-- get_staff_stage_performance: Staff completions grouped by stage
-- Returns per-staff counts for Filling, Covering, Decorating, Packing
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_staff_stage_performance(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  staff_id uuid,
  staff_name text,
  filling_count bigint,
  covering_count bigint,
  decorating_count bigint,
  packing_count bigint,
  total_count bigint
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
  -- Permission check: only Supervisor or Admin can view all staff analytics
  v_role := public.app_role();
  IF v_role NOT IN ('Supervisor', 'Admin') THEN
    RAISE EXCEPTION 'Access denied: requires Supervisor or Admin role';
  END IF;

  -- Clamp p_days to valid range (1-365)
  v_days := GREATEST(1, LEAST(COALESCE(p_days, 30), 365));

  -- Calculate start timestamp for date range
  v_start_ts := now() - (v_days || ' days')::interval;

  RETURN QUERY
  SELECT
    se.staff_id,
    COALESCE(s.full_name, 'Unknown')::text as staff_name,
    COUNT(*) FILTER (WHERE se.stage = 'Filling')::bigint as filling_count,
    COUNT(*) FILTER (WHERE se.stage = 'Covering')::bigint as covering_count,
    COUNT(*) FILTER (WHERE se.stage = 'Decorating')::bigint as decorating_count,
    COUNT(*) FILTER (WHERE se.stage = 'Packing')::bigint as packing_count,
    COUNT(*)::bigint as total_count
  FROM stage_events se
  LEFT JOIN staff_shared s ON se.staff_id = s.user_id
  WHERE se.event_type = 'complete'
    AND se.at_ts >= v_start_ts
    AND se.staff_id IS NOT NULL
  GROUP BY se.staff_id, s.full_name
  ORDER BY COUNT(*) DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_staff_stage_performance(integer) TO authenticated;

COMMENT ON FUNCTION public.get_staff_stage_performance(integer) IS
  'Returns staff performance metrics grouped by stage (Filling, Covering, Decorating, Packing) for the last N days';

COMMIT;
