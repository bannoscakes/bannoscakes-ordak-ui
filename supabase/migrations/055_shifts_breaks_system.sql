-- Migration: Shifts and Breaks System
-- Generated: 2025-11-10
-- Purpose: Add shift tracking and break management for staff time & payroll
-- Related: Task 7 in Master_Task.md

-- =============================================================================
-- TABLES
-- =============================================================================

-- Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_shared(user_id) ON DELETE CASCADE,
  store text NOT NULL CHECK (store IN ('bannos', 'flourlane')),
  start_ts timestamptz NOT NULL DEFAULT now(),
  end_ts timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create breaks table
CREATE TABLE IF NOT EXISTS public.breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  start_ts timestamptz NOT NULL DEFAULT now(),
  end_ts timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for querying staff shifts by date
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id_start 
  ON public.shifts(staff_id, start_ts DESC);

-- Index for finding active shifts (WHERE end_ts IS NULL)
CREATE INDEX IF NOT EXISTS idx_shifts_active 
  ON public.shifts(staff_id, end_ts) 
  WHERE end_ts IS NULL;

-- Index for breaks by shift
CREATE INDEX IF NOT EXISTS idx_breaks_shift_id 
  ON public.breaks(shift_id, start_ts DESC);

-- Index for active breaks
CREATE INDEX IF NOT EXISTS idx_breaks_active
  ON public.breaks(shift_id, end_ts)
  WHERE end_ts IS NULL;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff can read their own shifts, Admin can read all
CREATE POLICY shifts_select_policy ON public.shifts
  FOR SELECT TO authenticated
  USING (
    staff_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.staff_shared 
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- RLS Policy: Staff can read their own breaks, Admin can read all
CREATE POLICY breaks_select_policy ON public.breaks
  FOR SELECT TO authenticated
  USING (
    shift_id IN (
      SELECT id FROM public.shifts WHERE staff_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_shared 
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- RLS Policy: No direct writes (RPC-only via SECURITY DEFINER)
CREATE POLICY shifts_insert_policy ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY shifts_update_policy ON public.shifts
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY breaks_insert_policy ON public.breaks
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY breaks_update_policy ON public.breaks
  FOR UPDATE TO authenticated
  USING (false);

-- Grant read access
GRANT SELECT ON public.shifts TO authenticated;
GRANT SELECT ON public.breaks TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.shifts IS 'Staff work shifts for time tracking and payroll';
COMMENT ON TABLE public.breaks IS 'Breaks taken during shifts for time tracking';

COMMENT ON COLUMN public.shifts.staff_id IS 'Staff member working this shift';
COMMENT ON COLUMN public.shifts.store IS 'Store where shift is worked (bannos or flourlane)';
COMMENT ON COLUMN public.shifts.start_ts IS 'When shift started';
COMMENT ON COLUMN public.shifts.end_ts IS 'When shift ended (NULL = currently active)';

COMMENT ON COLUMN public.breaks.shift_id IS 'Shift this break belongs to';
COMMENT ON COLUMN public.breaks.start_ts IS 'When break started';
COMMENT ON COLUMN public.breaks.end_ts IS 'When break ended (NULL = currently on break)';

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Function 1/5: start_shift
-- Starts a new shift for the authenticated staff member
CREATE OR REPLACE FUNCTION public.start_shift(
  p_staff_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_shift_id uuid;
  v_store text;
BEGIN
  -- Use provided staff_id or fallback to authenticated user
  v_staff_id := COALESCE(p_staff_id, auth.uid());
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get staff member's store
  SELECT store INTO v_store
  FROM public.staff_shared
  WHERE user_id = v_staff_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;
  
  -- Check for active shift
  IF EXISTS (
    SELECT 1 FROM public.shifts 
    WHERE staff_id = v_staff_id AND end_ts IS NULL
  ) THEN
    RAISE EXCEPTION 'Staff member already has an active shift';
  END IF;
  
  -- Create new shift
  INSERT INTO public.shifts (staff_id, store, start_ts)
  VALUES (v_staff_id, v_store, now())
  RETURNING id INTO v_shift_id;
  
  -- Log to audit_log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'start_shift',
    auth.uid(),
    'start_shift_rpc',
    jsonb_build_object(
      'shift_id', v_shift_id,
      'staff_id', v_staff_id,
      'store', v_store
    )
  );
  
  RETURN v_shift_id;
END;
$$;

-- Function 2/5: end_shift
-- Ends the active shift for the authenticated staff member
CREATE OR REPLACE FUNCTION public.end_shift(
  p_staff_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_shift_id uuid;
BEGIN
  -- Use provided staff_id or fallback to authenticated user
  v_staff_id := COALESCE(p_staff_id, auth.uid());
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get active shift
  SELECT id INTO v_shift_id
  FROM public.shifts
  WHERE staff_id = v_staff_id AND end_ts IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active shift found for staff member';
  END IF;
  
  -- End active shift
  UPDATE public.shifts
  SET end_ts = now(), updated_at = now()
  WHERE id = v_shift_id;
  
  -- End any active breaks in this shift
  UPDATE public.breaks
  SET end_ts = now(), updated_at = now()
  WHERE shift_id = v_shift_id AND end_ts IS NULL;
  
  -- Log to audit_log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'end_shift',
    auth.uid(),
    'end_shift_rpc',
    jsonb_build_object(
      'shift_id', v_shift_id,
      'staff_id', v_staff_id
    )
  );
END;
$$;

-- Function 3/5: start_break
-- Starts a break during the active shift
CREATE OR REPLACE FUNCTION public.start_break(
  p_staff_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_shift_id uuid;
  v_break_id uuid;
BEGIN
  -- Use provided staff_id or fallback to authenticated user
  v_staff_id := COALESCE(p_staff_id, auth.uid());
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get active shift
  SELECT id INTO v_shift_id
  FROM public.shifts
  WHERE staff_id = v_staff_id AND end_ts IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active shift found - must start shift before taking a break';
  END IF;
  
  -- Check for active break
  IF EXISTS (
    SELECT 1 FROM public.breaks 
    WHERE shift_id = v_shift_id AND end_ts IS NULL
  ) THEN
    RAISE EXCEPTION 'Break already active for this shift';
  END IF;
  
  -- Create break
  INSERT INTO public.breaks (shift_id, start_ts)
  VALUES (v_shift_id, now())
  RETURNING id INTO v_break_id;
  
  -- Log to audit_log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'start_break',
    auth.uid(),
    'start_break_rpc',
    jsonb_build_object(
      'break_id', v_break_id,
      'shift_id', v_shift_id,
      'staff_id', v_staff_id
    )
  );
  
  RETURN v_break_id;
END;
$$;

-- Function 4/5: end_break
-- Ends the active break
CREATE OR REPLACE FUNCTION public.end_break(
  p_staff_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_shift_id uuid;
  v_break_id uuid;
BEGIN
  -- Use provided staff_id or fallback to authenticated user
  v_staff_id := COALESCE(p_staff_id, auth.uid());
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get active shift
  SELECT id INTO v_shift_id
  FROM public.shifts
  WHERE staff_id = v_staff_id AND end_ts IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active shift found';
  END IF;
  
  -- Get active break
  SELECT id INTO v_break_id
  FROM public.breaks
  WHERE shift_id = v_shift_id AND end_ts IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active break found for this shift';
  END IF;
  
  -- End active break
  UPDATE public.breaks
  SET end_ts = now(), updated_at = now()
  WHERE id = v_break_id;
  
  -- Log to audit_log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'end_break',
    auth.uid(),
    'end_break_rpc',
    jsonb_build_object(
      'break_id', v_break_id,
      'shift_id', v_shift_id,
      'staff_id', v_staff_id
    )
  );
END;
$$;

-- Function 5/5: get_current_shift
-- Gets the active shift for a staff member
CREATE OR REPLACE FUNCTION public.get_current_shift(
  p_staff_id uuid DEFAULT NULL
)
RETURNS TABLE(
  shift_id uuid,
  staff_id uuid,
  store text,
  start_ts timestamptz,
  end_ts timestamptz,
  active_break_id uuid,
  break_start_ts timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  -- Use provided staff_id or fallback to authenticated user
  v_staff_id := COALESCE(p_staff_id, auth.uid());
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id as shift_id,
    s.staff_id,
    s.store,
    s.start_ts,
    s.end_ts,
    b.id as active_break_id,
    b.start_ts as break_start_ts
  FROM public.shifts s
  LEFT JOIN public.breaks b ON b.shift_id = s.id AND b.end_ts IS NULL
  WHERE s.staff_id = v_staff_id 
    AND s.end_ts IS NULL
  LIMIT 1;
END;
$$;

-- =============================================================================
-- GRANT EXECUTE PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.start_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_break(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_break(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_shift(uuid) TO authenticated;

-- =============================================================================
-- FUNCTION COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.start_shift IS 'Start a new shift for a staff member. Validates no active shift exists.';
COMMENT ON FUNCTION public.end_shift IS 'End the active shift and any active breaks for a staff member.';
COMMENT ON FUNCTION public.start_break IS 'Start a break during an active shift. Validates shift exists and no active break.';
COMMENT ON FUNCTION public.end_break IS 'End the active break during a shift.';
COMMENT ON FUNCTION public.get_current_shift IS 'Get the active shift and any active break for a staff member.';

