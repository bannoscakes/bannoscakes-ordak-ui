-- Migration: Fix shift RPCs audit_log Foreign Key Violation
-- Purpose: Remove audit_log inserts that cause performed_by FK violation
-- Same fix as 064_fix_sync_audit_log_fkey.sql but for shift functions
-- The shifts table already provides audit trail via timestamps
--
-- Also adds a unique constraint to prevent race conditions where two
-- concurrent requests could both pass the EXISTS check and create
-- duplicate active shifts for the same staff member.

BEGIN;

-- ============================================================================
-- Add unique constraint to prevent duplicate active shifts (race condition fix)
-- ============================================================================
-- This uses a partial unique index: only one row per staff_id can have end_ts IS NULL
-- This enforces the business rule at the database level, not just application level

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_one_active_per_staff
  ON public.shifts (staff_id)
  WHERE end_ts IS NULL;

-- ============================================================================
-- Fix start_shift RPC - Remove audit_log insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_shift(
  p_store text,
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
  v_staff_store text;
BEGIN
  -- Validate store parameter
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %. Must be bannos or flourlane', p_store;
  END IF;

  -- Use provided staff_id or fallback to authenticated user
  v_staff_id := COALESCE(p_staff_id, auth.uid());

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get staff member's store assignment
  SELECT store INTO v_staff_store
  FROM public.staff_shared
  WHERE user_id = v_staff_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;

  -- Validate staff is assigned to this store
  IF v_staff_store NOT IN (p_store, 'both') THEN
    RAISE EXCEPTION 'Staff member is not assigned to % store', p_store;
  END IF;

  -- Permission check: only allow self-service or Admin
  IF v_staff_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.staff_shared
    WHERE user_id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: cannot manage other staff''s shifts';
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
  VALUES (v_staff_id, p_store, now())
  RETURNING id INTO v_shift_id;

  -- REMOVED: audit_log insert (causes FK violation)
  -- The shifts table already provides audit trail via timestamps

  RETURN v_shift_id;
END;
$$;

-- ============================================================================
-- Fix end_shift RPC - Remove audit_log insert
-- ============================================================================

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

  -- Permission check: only allow self-service or Admin
  IF v_staff_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.staff_shared
    WHERE user_id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: cannot manage other staff''s shifts';
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

  -- REMOVED: audit_log insert (causes FK violation)
  -- The shifts table already provides audit trail via timestamps
END;
$$;

-- ============================================================================
-- Fix start_break RPC - Remove audit_log insert
-- ============================================================================

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

  -- Permission check: only allow self-service or Admin
  IF v_staff_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.staff_shared
    WHERE user_id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: cannot manage other staff''s shifts';
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

  -- REMOVED: audit_log insert (causes FK violation)
  -- The breaks table already provides audit trail via timestamps

  RETURN v_break_id;
END;
$$;

-- ============================================================================
-- Fix end_break RPC - Remove audit_log insert
-- ============================================================================

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

  -- Permission check: only allow self-service or Admin
  IF v_staff_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.staff_shared
    WHERE user_id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: cannot manage other staff''s shifts';
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

  -- REMOVED: audit_log insert (causes FK violation)
  -- The breaks table already provides audit trail via timestamps
END;
$$;

COMMIT;
