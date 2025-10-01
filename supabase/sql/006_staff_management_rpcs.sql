-- 006_staff_management_rpcs.sql
-- Phase 2: Staff Management RPCs
-- Implements staff, roles, and shift management functions

-- =============================================
-- STAFF MANAGEMENT RPCs
-- =============================================

-- Get all staff members with their roles and status
CREATE OR REPLACE FUNCTION public.get_staff_list(
  p_store text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  last_login timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view staff
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view staff list';
  END IF;

  RETURN QUERY
  SELECT 
    s.user_id,
    s.full_name,
    s.role,
    s.is_active,
    s.created_at,
    s.last_login
  FROM public.staff_shared s
  WHERE (p_store IS NULL OR s.store = p_store)
    AND (p_role IS NULL OR s.role = p_role)
    AND (p_is_active IS NULL OR s.is_active = p_is_active)
  ORDER BY s.full_name;
END;
$$;

-- Get staff member details by user_id
CREATE OR REPLACE FUNCTION public.get_staff_member(
  p_user_id uuid
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  store text,
  is_active boolean,
  created_at timestamptz,
  last_login timestamptz,
  phone text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view staff
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view staff details';
  END IF;

  RETURN QUERY
  SELECT 
    s.user_id,
    s.full_name,
    s.role,
    s.store,
    s.is_active,
    s.created_at,
    s.last_login,
    s.phone,
    s.email
  FROM public.staff_shared s
  WHERE s.user_id = p_user_id;
END;
$$;

-- Create or update staff member
CREATE OR REPLACE FUNCTION public.upsert_staff_member(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_store text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user has permission to manage staff
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to manage staff';
  END IF;

  -- Validate role
  IF p_role NOT IN ('Staff', 'Supervisor', 'Admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Upsert staff member
  INSERT INTO public.staff_shared (
    user_id, full_name, role, store, phone, email, is_active
  ) VALUES (
    p_user_id, p_full_name, p_role, p_store, p_phone, p_email, p_is_active
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    store = EXCLUDED.store,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING user_id INTO v_user_id;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, new_values, performed_by
  ) VALUES (
    'staff_shared', v_user_id::text, 'upsert', 
    jsonb_build_object(
      'user_id', v_user_id,
      'full_name', p_full_name,
      'role', p_role,
      'store', p_store,
      'is_active', p_is_active
    ),
    auth.uid()
  );

  RETURN v_user_id;
END;
$$;

-- Deactivate staff member (soft delete)
CREATE OR REPLACE FUNCTION public.deactivate_staff_member(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_values jsonb;
BEGIN
  -- Check if user has permission to manage staff
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to deactivate staff';
  END IF;

  -- Get current values for audit log
  SELECT to_jsonb(s.*) INTO v_old_values
  FROM public.staff_shared s
  WHERE s.user_id = p_user_id;

  -- Deactivate staff member
  UPDATE public.staff_shared 
  SET is_active = false, updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    'staff_shared', p_user_id::text, 'deactivate',
    v_old_values,
    jsonb_build_object('is_active', false),
    auth.uid()
  );

  RETURN FOUND;
END;
$$;

-- =============================================
-- SHIFT MANAGEMENT RPCs
-- =============================================

-- Start a shift for a staff member
CREATE OR REPLACE FUNCTION public.start_shift(
  p_staff_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift_id uuid;
  v_current_shift_id uuid;
BEGIN
  -- Check if user has permission to start shifts
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to start shifts';
  END IF;

  -- Check if staff member exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_shared 
    WHERE user_id = p_staff_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;

  -- Check if there's already an active shift
  SELECT id INTO v_current_shift_id
  FROM public.staff_shifts
  WHERE staff_id = p_staff_id 
    AND is_active = true
    AND shift_end IS NULL;

  IF v_current_shift_id IS NOT NULL THEN
    RAISE EXCEPTION 'Staff member already has an active shift';
  END IF;

  -- Start new shift
  INSERT INTO public.staff_shifts (
    staff_id, shift_start, is_active
  ) VALUES (
    p_staff_id, now(), true
  ) RETURNING id INTO v_shift_id;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, new_values, performed_by
  ) VALUES (
    'staff_shifts', v_shift_id::text, 'start_shift',
    jsonb_build_object(
      'staff_id', p_staff_id,
      'shift_start', now()
    ),
    auth.uid()
  );

  RETURN v_shift_id;
END;
$$;

-- End a shift for a staff member
CREATE OR REPLACE FUNCTION public.end_shift(
  p_staff_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift_id uuid;
  v_old_values jsonb;
BEGIN
  -- Check if user has permission to end shifts
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to end shifts';
  END IF;

  -- Find active shift
  SELECT id, to_jsonb(s.*) INTO v_shift_id, v_old_values
  FROM public.staff_shifts s
  WHERE staff_id = p_staff_id 
    AND is_active = true
    AND shift_end IS NULL;

  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'No active shift found for staff member';
  END IF;

  -- End the shift
  UPDATE public.staff_shifts
  SET 
    shift_end = now(),
    is_active = false,
    updated_at = now()
  WHERE id = v_shift_id;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    'staff_shifts', v_shift_id::text, 'end_shift',
    v_old_values,
    jsonb_build_object(
      'shift_end', now(),
      'is_active', false
    ),
    auth.uid()
  );

  RETURN true;
END;
$$;

-- Get current shift for a staff member
CREATE OR REPLACE FUNCTION public.get_current_shift(
  p_staff_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  shift_id uuid,
  staff_id uuid,
  shift_start timestamptz,
  shift_end timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  total_break_minutes integer,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view shifts
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view shifts';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.staff_id,
    s.shift_start,
    s.shift_end,
    s.break_start,
    s.break_end,
    s.total_break_minutes,
    s.is_active
  FROM public.staff_shifts s
  WHERE s.staff_id = p_staff_id 
    AND s.is_active = true
    AND s.shift_end IS NULL;
END;
$$;

-- Get shift history for a staff member
CREATE OR REPLACE FUNCTION public.get_shift_history(
  p_staff_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  shift_id uuid,
  staff_id uuid,
  shift_start timestamptz,
  shift_end timestamptz,
  total_hours numeric,
  total_break_minutes integer,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view shift history
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view shift history';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.staff_id,
    s.shift_start,
    s.shift_end,
    CASE 
      WHEN s.shift_end IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (s.shift_end - s.shift_start)) / 3600.0
      ELSE NULL
    END as total_hours,
    s.total_break_minutes,
    s.is_active
  FROM public.staff_shifts s
  WHERE s.staff_id = p_staff_id
    AND (p_start_date IS NULL OR s.shift_start::date >= p_start_date)
    AND (p_end_date IS NULL OR s.shift_start::date <= p_end_date)
  ORDER BY s.shift_start DESC
  LIMIT p_limit;
END;
$$;

-- Start a break for a staff member
CREATE OR REPLACE FUNCTION public.start_break(
  p_staff_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift_id uuid;
BEGIN
  -- Check if user has permission to manage breaks
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to manage breaks';
  END IF;

  -- Find active shift
  SELECT id INTO v_shift_id
  FROM public.staff_shifts
  WHERE staff_id = p_staff_id 
    AND is_active = true
    AND shift_end IS NULL;

  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'No active shift found for staff member';
  END IF;

  -- Check if already on break
  IF EXISTS (
    SELECT 1 FROM public.staff_shifts
    WHERE id = v_shift_id 
      AND break_start IS NOT NULL 
      AND break_end IS NULL
  ) THEN
    RAISE EXCEPTION 'Staff member is already on break';
  END IF;

  -- Start break
  UPDATE public.staff_shifts
  SET 
    break_start = now(),
    updated_at = now()
  WHERE id = v_shift_id;

  RETURN true;
END;
$$;

-- End a break for a staff member
CREATE OR REPLACE FUNCTION public.end_break(
  p_staff_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift_id uuid;
  v_break_duration integer;
BEGIN
  -- Check if user has permission to manage breaks
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to manage breaks';
  END IF;

  -- Find active shift with ongoing break
  SELECT id INTO v_shift_id
  FROM public.staff_shifts
  WHERE staff_id = p_staff_id 
    AND is_active = true
    AND shift_end IS NULL
    AND break_start IS NOT NULL 
    AND break_end IS NULL;

  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'No active break found for staff member';
  END IF;

  -- Calculate break duration in minutes
  v_break_duration := EXTRACT(EPOCH FROM (now() - break_start)) / 60;

  -- End break and update total break time
  UPDATE public.staff_shifts
  SET 
    break_end = now(),
    total_break_minutes = total_break_minutes + v_break_duration,
    updated_at = now()
  WHERE id = v_shift_id;

  RETURN true;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

-- Grant execute permissions on all staff management functions
GRANT EXECUTE ON FUNCTION public.get_staff_list(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_staff_member(uuid, text, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_staff_member(uuid) TO authenticated;

-- Grant execute permissions on all shift management functions
GRANT EXECUTE ON FUNCTION public.start_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shift_history(uuid, date, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_break(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_break(uuid) TO authenticated;
