-- ============================================================================
-- Migration: Fix audit_log FK violation in all order flow functions
-- Date: 2025-12-15
--
-- PROBLEM:
-- audit_log.performed_by has FK to public.users, but public.users is often empty
-- (users exist in auth.users but not public.users). Functions that INSERT into
-- audit_log with auth.uid() fail with FK violation.
--
-- SOLUTION:
-- Add user existence check before inserting to audit_log. If user doesn't exist
-- in public.users, skip the audit_log insert (stage_events still captures the event).
--
-- FUNCTIONS FIXED:
-- 1. assign_staff
-- 2. complete_filling
-- 3. complete_covering
-- 4. complete_decorating
-- 5. complete_packing
-- 6. adjust_staff_time
-- 7. upload_order_photo
-- ============================================================================

-- ============================================================================
-- Function 1/7: assign_staff
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_staff(
  p_order_id text,
  p_store text,
  p_staff_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
BEGIN
  -- Validate store parameter to prevent SQL injection
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  -- Check user existence once
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
  END IF;

  -- Get current stage for logging
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update order assignment
  EXECUTE format(
    'UPDATE public.%I SET assignee_id = $1, updated_at = now() WHERE id = $2',
    v_table_name
  )
  USING p_staff_id, p_order_id;

  -- Log to stage_events (always works - references staff_shared)
  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (
    p_store,
    p_order_id,
    v_current_stage,
    'assign',
    v_user_id,
    now(),
    jsonb_build_object('assigned_to', p_staff_id)
  );

  -- Log to audit_log only if user exists in public.users
  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'assign_staff',
      v_user_id,
      'rpc',
      jsonb_build_object('order_id', p_order_id, 'store', p_store, 'staff_id', p_staff_id)
    );
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 2/7: complete_filling
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_filling(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Check user existence once
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;

  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_current_stage != 'Filling' THEN
    RAISE EXCEPTION 'Order must be in Filling stage to complete filling';
  END IF;

  -- Update order stage
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Covering'', filling_complete_ts = now(), updated_at = now() WHERE id = $1',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  -- Log to stage_events (always works)
  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (
    p_store,
    p_order_id,
    'Filling',
    'complete',
    v_user_id,
    now(),
    jsonb_build_object('notes', p_notes)
  );

  -- Log to audit_log only if user exists in public.users
  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'complete_filling',
      v_user_id,
      'rpc',
      jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Filling', 'notes', p_notes)
    );
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 3/7: complete_covering
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_covering(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Check user existence once
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;

  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_current_stage != 'Covering' THEN
    RAISE EXCEPTION 'Order must be in Covering stage to complete covering';
  END IF;

  -- Update order stage
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Decorating'', covering_complete_ts = now(), updated_at = now() WHERE id = $1',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  -- Log to stage_events (always works)
  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (
    p_store,
    p_order_id,
    'Covering',
    'complete',
    v_user_id,
    now(),
    jsonb_build_object('notes', p_notes)
  );

  -- Log to audit_log only if user exists in public.users
  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'complete_covering',
      v_user_id,
      'rpc',
      jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Covering', 'notes', p_notes)
    );
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 4/7: complete_decorating
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_decorating(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Check user existence once
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;

  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_current_stage != 'Decorating' THEN
    RAISE EXCEPTION 'Order must be in Decorating stage to complete decorating';
  END IF;

  -- Update order stage
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Packing'', decorating_complete_ts = now(), packing_start_ts = now(), updated_at = now() WHERE id = $1',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  -- Log to stage_events (always works)
  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (
    p_store,
    p_order_id,
    'Decorating',
    'complete',
    v_user_id,
    now(),
    jsonb_build_object('notes', p_notes)
  );

  -- Log to audit_log only if user exists in public.users
  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'complete_decorating',
      v_user_id,
      'rpc',
      jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Decorating', 'notes', p_notes)
    );
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 5/7: complete_packing
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_packing(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Check user existence once
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;

  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_current_stage != 'Packing' THEN
    RAISE EXCEPTION 'Order must be in Packing stage to complete packing';
  END IF;

  -- Update order stage
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Complete'', packing_complete_ts = now(), updated_at = now() WHERE id = $1',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  -- Log to stage_events (always works)
  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (
    p_store,
    p_order_id,
    'Packing',
    'complete',
    v_user_id,
    now(),
    jsonb_build_object('notes', p_notes)
  );

  -- Log to audit_log only if user exists in public.users
  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'complete_packing',
      v_user_id,
      'rpc',
      jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Packing', 'notes', p_notes)
    );
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 6/7: adjust_staff_time
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
DECLARE
  v_user_id uuid;
  v_user_exists boolean := false;
BEGIN
  v_user_id := auth.uid();

  -- Check user existence once
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
  END IF;

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

  -- Log adjustment only if user exists in public.users
  IF v_user_exists THEN
    INSERT INTO audit_log (action, performed_by, source, meta)
    VALUES (
      'time_entry_adjusted',
      v_user_id,
      'adjust_staff_time',
      jsonb_build_object(
        'shift_id', p_shift_id,
        'new_start', p_new_start,
        'new_end', p_new_end,
        'note', p_note
      )
    );
  END IF;
END;
$function$;

-- ============================================================================
-- Function 7/7: upload_order_photo
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upload_order_photo(
  p_order_id text,
  p_store text,
  p_url text,
  p_stage text,
  p_qc_status text DEFAULT 'ok',
  p_qc_issue text DEFAULT NULL,
  p_qc_comments text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_photo_id uuid;
  v_user_id uuid;
  v_user_exists boolean := false;
BEGIN
  v_user_id := auth.uid();

  -- Validate authentication
  IF p_order_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check user existence once
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;

  -- Validate inputs
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  IF p_stage NOT IN ('Filling','Covering','Decorating','Packing','Complete') THEN
    RAISE EXCEPTION 'Invalid stage: %', p_stage;
  END IF;

  IF p_qc_status NOT IN ('ok','needs_review','rejected') THEN
    RAISE EXCEPTION 'Invalid QC status: %', p_qc_status;
  END IF;

  -- Insert photo
  INSERT INTO public.order_photos (
    order_id,
    store,
    url,
    stage,
    qc_status,
    qc_issue,
    qc_comments,
    uploaded_by
  ) VALUES (
    p_order_id,
    p_store,
    p_url,
    p_stage,
    p_qc_status,
    p_qc_issue,
    p_qc_comments,
    v_user_id
  ) RETURNING id INTO v_photo_id;

  -- Log to audit only if user exists in public.users
  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'photo_uploaded',
      v_user_id,
      'upload_order_photo',
      jsonb_build_object(
        'order_id', p_order_id,
        'store', p_store,
        'photo_id', v_photo_id,
        'qc_status', p_qc_status
      )
    );
  END IF;

  RETURN v_photo_id;
END;
$function$;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.assign_staff IS 'Assign staff to order. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.complete_filling IS 'Complete Filling stage. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.complete_covering IS 'Complete Covering stage. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.complete_decorating IS 'Complete Decorating stage. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.complete_packing IS 'Complete Packing stage. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.adjust_staff_time IS 'Admin time adjustment. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.upload_order_photo IS 'Upload QC photo. Safely skips audit_log if user not in public.users.';
