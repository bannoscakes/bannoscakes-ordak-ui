-- Migration: Staff Page RPCs Enhancement
-- Purpose: Add hourly_rate to get_staff_list, add RPC to get all active shifts,
--          and add RPC to update staff member details
-- Fixes: BUG 1 (shift status not showing) and BUG 2 (wage not persisting)

BEGIN;

-- ============================================================================
-- 1. Update get_staff_list to include hourly_rate and approved columns
-- ============================================================================
-- Must drop first because return type is changing

DROP FUNCTION IF EXISTS public.get_staff_list(text, boolean);

CREATE OR REPLACE FUNCTION public.get_staff_list(
  p_role text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  role text,
  store text,
  is_active boolean,
  phone text,
  created_at timestamptz,
  updated_at timestamptz,
  hourly_rate numeric,
  approved boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Check if caller is Admin (only Admins can see hourly_rate)
  SELECT ss.role INTO v_caller_role
  FROM public.staff_shared ss
  WHERE ss.user_id = auth.uid();

  RETURN QUERY
  SELECT
    s.user_id,
    s.full_name,
    s.email,
    s.role,
    s.store,
    s.is_active,
    s.phone,
    s.created_at,
    s.updated_at,
    CASE WHEN v_caller_role = 'Admin' THEN s.hourly_rate ELSE NULL END as hourly_rate,
    s.approved
  FROM public.staff_shared s
  WHERE (p_role IS NULL OR s.role = p_role)
    AND (p_is_active IS NULL OR s.is_active = p_is_active)
  ORDER BY s.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_list(text, boolean) TO authenticated;

-- ============================================================================
-- 2. New RPC: get_all_active_shifts - Returns all staff with active shifts
-- ============================================================================
-- Used by Staff page to show who's currently on shift

CREATE OR REPLACE FUNCTION public.get_all_active_shifts()
RETURNS TABLE(
  staff_id uuid,
  shift_id uuid,
  store text,
  start_ts timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.staff_id,
    s.id as shift_id,
    s.store,
    s.start_ts
  FROM public.shifts s
  WHERE s.end_ts IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_active_shifts() TO authenticated;

COMMENT ON FUNCTION public.get_all_active_shifts IS
  'Returns all currently active shifts (where end_ts IS NULL). Used by Staff page to show on-shift status.';

-- ============================================================================
-- 3. New RPC: update_staff_member - Updates staff member details
-- ============================================================================
-- Admin only - allows updating name, role, hourly_rate, is_active, approved

CREATE OR REPLACE FUNCTION public.update_staff_member(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_hourly_rate numeric DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_approved boolean DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only Admin can update staff members
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_shared
    WHERE user_id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only Admin can update staff members';
  END IF;

  -- Validate target staff exists
  IF NOT EXISTS (SELECT 1 FROM public.staff_shared WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Staff member not found: %', p_user_id;
  END IF;

  -- Validate role if provided
  IF p_role IS NOT NULL AND p_role NOT IN ('Admin', 'Supervisor', 'Staff') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be Admin, Supervisor, or Staff', p_role;
  END IF;

  -- Validate hourly_rate if provided
  IF p_hourly_rate IS NOT NULL AND p_hourly_rate < 0 THEN
    RAISE EXCEPTION 'Hourly rate cannot be negative';
  END IF;

  -- Update staff member (only non-null values)
  UPDATE public.staff_shared
  SET
    full_name = COALESCE(p_full_name, full_name),
    role = COALESCE(p_role, role),
    hourly_rate = COALESCE(p_hourly_rate, hourly_rate),
    is_active = COALESCE(p_is_active, is_active),
    approved = COALESCE(p_approved, approved),
    phone = COALESCE(p_phone, phone),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff_member(uuid, text, text, numeric, boolean, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.update_staff_member IS
  'Admin-only: Updates staff member details including name, role, hourly_rate, is_active, approved, and phone.';

COMMIT;
