-- ============================================================================
-- Migration: Unassign orders on stage completion
-- Date: 2025-12-16
--
-- PURPOSE:
-- After completing Filling, Covering, or Decorating stages, the order should
-- be unassigned (assignee_id = NULL) so it returns to the queue for the next
-- stage assignment.
--
-- Packing does not require assignment - anyone can pack completed orders.
--
-- FUNCTIONS UPDATED:
-- 1. complete_filling - adds assignee_id = NULL
-- 2. complete_covering - adds assignee_id = NULL
-- 3. complete_decorating - adds assignee_id = NULL
-- ============================================================================

-- ============================================================================
-- Function 1/3: complete_filling
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_filling(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_rows_affected integer;
BEGIN
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

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

  EXECUTE format(
    'UPDATE public.%I SET stage = ''Covering'', filling_complete_ts = now(), assignee_id = NULL, updated_at = now() WHERE id = $1 AND stage = ''Filling''',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (p_store, p_order_id, 'Filling', 'complete', v_user_id, now(), jsonb_build_object('notes', p_notes));

  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES ('complete_filling', v_user_id, 'rpc', jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Filling', 'notes', p_notes));
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 2/3: complete_covering
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_covering(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_rows_affected integer;
BEGIN
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

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

  EXECUTE format(
    'UPDATE public.%I SET stage = ''Decorating'', covering_complete_ts = now(), assignee_id = NULL, updated_at = now() WHERE id = $1 AND stage = ''Covering''',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (p_store, p_order_id, 'Covering', 'complete', v_user_id, now(), jsonb_build_object('notes', p_notes));

  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES ('complete_covering', v_user_id, 'rpc', jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Covering', 'notes', p_notes));
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Function 3/3: complete_decorating
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_decorating(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_rows_affected integer;
BEGIN
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

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

  EXECUTE format(
    'UPDATE public.%I SET stage = ''Packing'', decorating_complete_ts = now(), packing_start_ts = now(), assignee_id = NULL, updated_at = now() WHERE id = $1 AND stage = ''Decorating''',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (p_store, p_order_id, 'Decorating', 'complete', v_user_id, now(), jsonb_build_object('notes', p_notes));

  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES ('complete_decorating', v_user_id, 'rpc', jsonb_build_object('order_id', p_order_id, 'store', p_store, 'stage', 'Decorating', 'notes', p_notes));
  END IF;

  RETURN true;
END;
$function$;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.complete_filling IS 'Complete Filling stage. Unassigns order for next stage assignment.';
COMMENT ON FUNCTION public.complete_covering IS 'Complete Covering stage. Unassigns order for next stage assignment.';
COMMENT ON FUNCTION public.complete_decorating IS 'Complete Decorating stage. Unassigns order for next stage assignment.';
