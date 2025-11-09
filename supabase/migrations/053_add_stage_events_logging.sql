-- Migration 053: Add stage_events logging to completion RPCs
-- Date: 2025-11-08
-- Task: Master_Task.md - Task 6: Update RPCs to log to stage_events
--
-- This migration updates all stage completion RPCs to log events to the
-- new stage_events table (in addition to existing audit_log).

-- ============================================================================
-- Function 1/4: complete_filling - Add stage_events logging
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
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;
  
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
    'UPDATE public.%I SET stage = ''Covering'', updated_at = now() WHERE id = $1', 
    v_table_name
  )
  USING p_order_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;
  
  -- Log to stage_events (NEW)
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
  
  -- Log to audit_log (EXISTING - keep for backward compatibility)
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'complete_filling', 
    v_user_id, 
    'rpc', 
    jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Filling', 'notes', p_notes)
  );
  
  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 2/4: complete_covering - Add stage_events logging
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
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;
  
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
    'UPDATE public.%I SET stage = ''Decorating'', updated_at = now() WHERE id = $1', 
    v_table_name
  )
  USING p_order_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;
  
  -- Log to stage_events (NEW)
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
  
  -- Log to audit_log (EXISTING - keep for backward compatibility)
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'complete_covering', 
    v_user_id, 
    'rpc', 
    jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Covering', 'notes', p_notes)
  );
  
  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 3/4: complete_decorating - Add stage_events logging
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
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;
  
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
    'UPDATE public.%I SET stage = ''Packing'', updated_at = now() WHERE id = $1', 
    v_table_name
  )
  USING p_order_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;
  
  -- Log to stage_events (NEW)
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
  
  -- Log to audit_log (EXISTING - keep for backward compatibility)
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'complete_decorating', 
    v_user_id, 
    'rpc', 
    jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Decorating', 'notes', p_notes)
  );
  
  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 4/4: complete_packing - Add stage_events logging
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
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;
  
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
    'UPDATE public.%I SET stage = ''Complete'', updated_at = now() WHERE id = $1', 
    v_table_name
  )
  USING p_order_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;
  
  -- Log to stage_events (NEW)
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
  
  -- Log to audit_log (EXISTING - keep for backward compatibility)
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'complete_packing', 
    v_user_id, 
    'rpc', 
    jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Packing', 'notes', p_notes)
  );
  
  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 5/5: assign_staff - Add stage_events logging
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
BEGIN
  -- Validate store parameter to prevent SQL injection
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();
  
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
  
  -- Log to stage_events (NEW)
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
  
  -- Log to audit_log (NEW - was missing before)
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'assign_staff', 
    v_user_id, 
    'rpc', 
    jsonb_build_object('order_id', p_order_id, 'store', p_store, 'staff_id', p_staff_id)
  );
  
  RETURN true;
END;
$function$;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION complete_filling IS 'Complete Filling stage and advance to Covering. Logs to stage_events and audit_log.';
COMMENT ON FUNCTION complete_covering IS 'Complete Covering stage and advance to Decorating. Logs to stage_events and audit_log.';
COMMENT ON FUNCTION complete_decorating IS 'Complete Decorating stage and advance to Packing. Logs to stage_events and audit_log.';
COMMENT ON FUNCTION complete_packing IS 'Complete Packing stage and mark order Complete. Logs to stage_events and audit_log.';
COMMENT ON FUNCTION assign_staff IS 'Assign staff member to order. Logs to stage_events and audit_log.';

