-- Migration: Fix get_staff_times parameter types
-- Issue: #430 - Time & Payroll page broken with 400 error
-- Cause: PostgREST strict type checking rejects string params for date type
-- Fix: Change p_from/p_to from date to text, cast internally
-- Security: Add Admin-only role check for payroll data access
-- Note: Must REVOKE and DROP old signatures first to avoid PostgREST overload rejection

BEGIN;

-- ============================================================================
-- Revoke and drop old function signatures (date params) to avoid overloading
-- PostgREST does not expose overloaded RPC functions with identical names
-- ============================================================================

-- Revoke permissions from old signatures first (IF EXISTS handles missing functions)
DO $$
BEGIN
  -- Revoke from old get_staff_times(date, date, uuid) if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_staff_times'
    AND p.proargtypes::regtype[]::text[] = ARRAY['date', 'date', 'uuid']::text[]
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.get_staff_times(date, date, uuid) FROM authenticated;
  END IF;

  -- Revoke from old get_staff_times_detail(uuid, date, date) if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_staff_times_detail'
    AND p.proargtypes::regtype[]::text[] = ARRAY['uuid', 'date', 'date']::text[]
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.get_staff_times_detail(uuid, date, date) FROM authenticated;
  END IF;
END $$;

-- Drop old signatures
DROP FUNCTION IF EXISTS public.get_staff_times(date, date, uuid);
DROP FUNCTION IF EXISTS public.get_staff_times_detail(uuid, date, date);

-- ============================================================================
-- Fix get_staff_times - Accept text params, cast to date internally
-- Security: Admin-only access for payroll data
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_times(
  p_from text,
  p_to text,
  p_staff_id uuid DEFAULT NULL
) RETURNS TABLE(
  staff_id uuid,
  staff_name text,
  days_worked integer,
  total_shift_hours numeric,
  total_break_minutes numeric,
  net_hours numeric,
  hourly_rate numeric,
  total_pay numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_from date;
  v_to date;
BEGIN
  -- Security: Only Admin can access payroll data
  IF app_role() != 'Admin' THEN
    RAISE EXCEPTION 'Access denied: Only Admin can access payroll data';
  END IF;

  -- Cast text to date
  v_from := p_from::date;
  v_to := p_to::date;

  -- Validate date range
  IF v_from > v_to THEN
    RAISE EXCEPTION 'Invalid date range: p_from (%) must be <= p_to (%)', v_from, v_to;
  END IF;

  RETURN QUERY
  SELECT
    s.user_id as staff_id,
    s.full_name as staff_name,
    COUNT(DISTINCT DATE(sh.start_ts))::integer as days_worked,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600
    ), 0)::numeric as total_shift_hours,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 60
    ), 0)::numeric as total_break_minutes,
    (
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600
      ), 0) -
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 3600
      ), 0)
    )::numeric as net_hours,
    COALESCE(s.hourly_rate, 0)::numeric as hourly_rate,
    (
      (
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600
        ), 0) -
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 3600
        ), 0)
      ) * COALESCE(s.hourly_rate, 0)
    )::numeric as total_pay
  FROM staff_shared s
  LEFT JOIN shifts sh ON sh.staff_id = s.user_id
    AND sh.start_ts >= v_from::timestamptz
    AND sh.start_ts < (v_to + interval '1 day')::timestamptz
  LEFT JOIN breaks b ON b.shift_id = sh.id
  WHERE (p_staff_id IS NULL OR s.user_id = p_staff_id)
    AND s.is_active = true
  GROUP BY s.user_id, s.full_name, s.hourly_rate
  HAVING COUNT(sh.id) > 0  -- Only show staff with shifts in date range
  ORDER BY s.full_name;
END;
$function$;

-- ============================================================================
-- Fix get_staff_times_detail - Accept text params, cast to date internally
-- Security: Admin-only access for payroll data
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_times_detail(
  p_staff_id uuid,
  p_from text,
  p_to text
) RETURNS TABLE(
  shift_date date,
  shift_id uuid,
  shift_start timestamptz,
  shift_end timestamptz,
  break_count integer,
  break_minutes numeric,
  net_hours numeric,
  notes text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_from date;
  v_to date;
BEGIN
  -- Security: Only Admin can access payroll data
  IF app_role() != 'Admin' THEN
    RAISE EXCEPTION 'Access denied: Only Admin can access payroll data';
  END IF;

  -- Cast text to date
  v_from := p_from::date;
  v_to := p_to::date;

  -- Validate date range
  IF v_from > v_to THEN
    RAISE EXCEPTION 'Invalid date range: p_from (%) must be <= p_to (%)', v_from, v_to;
  END IF;

  RETURN QUERY
  SELECT
    DATE(sh.start_ts) as shift_date,
    sh.id as shift_id,
    sh.start_ts as shift_start,
    sh.end_ts as shift_end,
    COUNT(b.id)::integer as break_count,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 60
    ), 0)::numeric as break_minutes,
    (
      EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600 -
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 3600
      ), 0)
    )::numeric as net_hours,
    NULL::text as notes  -- Can add notes column to shifts table in future
  FROM shifts sh
  LEFT JOIN breaks b ON b.shift_id = sh.id
  WHERE sh.staff_id = p_staff_id
    AND sh.start_ts >= v_from::timestamptz
    AND sh.start_ts < (v_to + interval '1 day')::timestamptz
  GROUP BY sh.id, sh.start_ts, sh.end_ts
  ORDER BY sh.start_ts DESC;
END;
$function$;

-- ============================================================================
-- Grant permissions for new function signatures
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_staff_times(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_times_detail(uuid, text, text) TO authenticated;

COMMIT;
