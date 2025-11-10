-- Migration: Task 13 - Time & Payroll RPCs (Backend Only)
-- Purpose: Enable Time & Payroll page to display real shift/break data

BEGIN;

-- ============================================================================
-- RPC 1: get_staff_times - Summary table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_times(
  p_from date,
  p_to date,
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
BEGIN
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
    AND sh.start_ts >= p_from::timestamptz 
    AND sh.start_ts < (p_to::date + interval '1 day')::timestamptz
  LEFT JOIN breaks b ON b.shift_id = sh.id
  WHERE (p_staff_id IS NULL OR s.user_id = p_staff_id)
    AND s.is_active = true
  GROUP BY s.user_id, s.full_name, s.hourly_rate
  HAVING COUNT(sh.id) > 0  -- Only show staff with shifts in date range
  ORDER BY s.full_name;
END;
$function$;

-- ============================================================================
-- RPC 2: get_staff_times_detail - Daily breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_times_detail(
  p_staff_id uuid,
  p_from date,
  p_to date
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
BEGIN
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
    AND sh.start_ts >= p_from::timestamptz
    AND sh.start_ts < (p_to::date + interval '1 day')::timestamptz
  GROUP BY sh.id, sh.start_ts, sh.end_ts
  ORDER BY sh.start_ts DESC;
END;
$function$;

-- ============================================================================
-- RPC 3: adjust_staff_time - Admin corrections (optional)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_staff_time(
  p_shift_id uuid,
  p_new_start timestamptz DEFAULT NULL,
  p_new_end timestamptz DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only Admin can adjust time entries
  IF NOT check_user_role('Admin') THEN
    RAISE EXCEPTION 'Only Admin can adjust time entries';
  END IF;
  
  -- Validate shift exists
  IF NOT EXISTS (SELECT 1 FROM shifts WHERE id = p_shift_id) THEN
    RAISE EXCEPTION 'Shift not found: %', p_shift_id;
  END IF;
  
  -- Update shift times
  UPDATE shifts
  SET 
    start_ts = COALESCE(p_new_start, start_ts),
    end_ts = COALESCE(p_new_end, end_ts),
    updated_at = now()
  WHERE id = p_shift_id;
  
  -- Log adjustment
  INSERT INTO audit_log (action, performed_by, source, meta)
  VALUES (
    'time_entry_adjusted',
    auth.uid(),
    'adjust_staff_time',
    jsonb_build_object(
      'shift_id', p_shift_id,
      'new_start', p_new_start,
      'new_end', p_new_end,
      'note', p_note
    )
  );
END;
$function$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_staff_times(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_times_detail(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_staff_time(uuid, timestamptz, timestamptz, text) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_staff_times IS 'Get staff time summary for payroll. Calculates net hours (shift - breaks) and pay.';
COMMENT ON FUNCTION public.get_staff_times_detail IS 'Get daily shift breakdown for one staff member.';
COMMENT ON FUNCTION public.adjust_staff_time IS 'Admin-only: Adjust shift times with audit trail.';

COMMIT;

