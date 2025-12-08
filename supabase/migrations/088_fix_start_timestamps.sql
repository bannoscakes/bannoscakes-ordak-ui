-- ============================================================================
-- Migration: Fix start timestamps for all stages
-- Problem: Start timestamps were planned but never implemented
--   - filling_start_ts exists but code to set it was commented out
--   - covering_start_ts and decorating_start_ts columns don't exist
--   - packing_start_ts set at wrong time (when decorating ends)
-- Solution:
--   1. Add missing columns (covering_start_ts, decorating_start_ts)
--   2. Update print_barcode to set filling_start_ts on first print
--   3. Update complete_filling to set covering_start_ts
--   4. Update complete_covering to set decorating_start_ts
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing start timestamp columns
-- ============================================================================

-- Add covering_start_ts to orders_bannos
ALTER TABLE public.orders_bannos
ADD COLUMN IF NOT EXISTS covering_start_ts timestamptz NULL;

-- Add decorating_start_ts to orders_bannos
ALTER TABLE public.orders_bannos
ADD COLUMN IF NOT EXISTS decorating_start_ts timestamptz NULL;

-- Add covering_start_ts to orders_flourlane
ALTER TABLE public.orders_flourlane
ADD COLUMN IF NOT EXISTS covering_start_ts timestamptz NULL;

-- Add decorating_start_ts to orders_flourlane
ALTER TABLE public.orders_flourlane
ADD COLUMN IF NOT EXISTS decorating_start_ts timestamptz NULL;

-- Add comments
COMMENT ON COLUMN public.orders_bannos.covering_start_ts IS 'Timestamp when Covering stage started (set by complete_filling)';
COMMENT ON COLUMN public.orders_bannos.decorating_start_ts IS 'Timestamp when Decorating stage started (set by complete_covering)';
COMMENT ON COLUMN public.orders_flourlane.covering_start_ts IS 'Timestamp when Covering stage started (set by complete_filling)';
COMMENT ON COLUMN public.orders_flourlane.decorating_start_ts IS 'Timestamp when Decorating stage started (set by complete_covering)';

-- ============================================================================
-- STEP 2: Update print_barcode to set filling_start_ts on first print
-- ============================================================================

CREATE OR REPLACE FUNCTION public.print_barcode(
  p_store text,
  p_order_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_table_name text;
  v_order record;
  v_is_first_filling_print boolean := false;
  v_payload jsonb;
  v_user_id uuid;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Get order details
  v_table_name := 'orders_' || p_store;
  EXECUTE format(
    'SELECT * FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Check if this is first print in Filling stage
  -- Set filling_start_ts if not already set
  IF v_order.stage = 'Filling' THEN
    v_is_first_filling_print := (v_order.filling_start_ts IS NULL);

    IF v_order.filling_start_ts IS NULL THEN
      EXECUTE format(
        'UPDATE %I SET filling_start_ts = now() WHERE id = $1',
        v_table_name
      ) USING p_order_id;
    END IF;
  END IF;

  -- Log print event to stage_events
  INSERT INTO public.stage_events (
    store,
    order_id,
    stage,
    event_type,
    at_ts,
    staff_id,
    meta
  ) VALUES (
    p_store,
    p_order_id,
    v_order.stage,
    'print',
    now(),
    v_user_id,
    jsonb_build_object('first_filling_print', v_is_first_filling_print)
  );

  -- Build printable payload
  v_payload := jsonb_build_object(
    'order_number', v_order.shopify_order_number,
    'order_id', v_order.id,
    'product_title', v_order.product_title,
    'size', v_order.size,
    'due_date', v_order.due_date,
    'customer_name', v_order.customer_name,
    'stage', v_order.stage,
    'priority', CASE
      WHEN v_order.priority = 1 THEN 'HIGH'
      WHEN v_order.priority = 0 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    'barcode_content', format('%s-%s', p_store, p_order_id),
    'printed_at', now(),
    'printed_by', v_user_id
  );

  RETURN v_payload;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.print_barcode(text, text) TO authenticated;

COMMENT ON FUNCTION public.print_barcode IS 'Generate printable ticket payload and log print event. First print in Filling stage sets filling_start_ts.';

-- ============================================================================
-- STEP 3: Update complete_filling to set covering_start_ts
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

  -- Update order stage + set filling_complete_ts + set covering_start_ts
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Covering'', filling_complete_ts = now(), covering_start_ts = now(), updated_at = now() WHERE id = $1',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  -- Log to stage_events
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

  -- Log to audit_log
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
-- STEP 4: Update complete_covering to set decorating_start_ts
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

  -- Update order stage + set covering_complete_ts + set decorating_start_ts
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Decorating'', covering_complete_ts = now(), decorating_start_ts = now(), updated_at = now() WHERE id = $1',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Expected to update exactly 1 row, but updated % rows for order %', v_rows_affected, p_order_id;
  END IF;

  -- Log to stage_events
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

  -- Log to audit_log
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
-- Summary of timestamp flow after this migration:
--
-- FILLING:
--   - filling_start_ts: Set by print_barcode() on FIRST print in Filling stage
--   - filling_complete_ts: Set by complete_filling()
--
-- COVERING:
--   - covering_start_ts: Set by complete_filling() (when Filling ends)
--   - covering_complete_ts: Set by complete_covering()
--
-- DECORATING:
--   - decorating_start_ts: Set by complete_covering() (when Covering ends)
--   - decorating_complete_ts: Set by complete_decorating()
--
-- PACKING:
--   - packing_start_ts: Set by complete_decorating() (when Decorating ends)
--   - packing_complete_ts: Set by complete_packing()
-- ============================================================================
