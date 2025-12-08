-- ============================================================================
-- Migration: Fix start timestamps for all stages
-- Problem: Start timestamps were planned but never implemented
--   - filling_start_ts exists but code to set it was commented out in print_barcode()
--   - covering_start_ts and decorating_start_ts columns don't exist
--   - start_covering() and start_decorating() RPCs don't exist
-- Solution:
--   1. Add missing columns (covering_start_ts, decorating_start_ts)
--   2. Update print_barcode to set filling_start_ts on first print (uncomment code)
--   3. Create start_covering() RPC
--   4. Create start_decorating() RPC
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing start timestamp columns
-- ============================================================================

ALTER TABLE public.orders_bannos
ADD COLUMN IF NOT EXISTS covering_start_ts timestamptz NULL;

ALTER TABLE public.orders_bannos
ADD COLUMN IF NOT EXISTS decorating_start_ts timestamptz NULL;

ALTER TABLE public.orders_flourlane
ADD COLUMN IF NOT EXISTS covering_start_ts timestamptz NULL;

ALTER TABLE public.orders_flourlane
ADD COLUMN IF NOT EXISTS decorating_start_ts timestamptz NULL;

COMMENT ON COLUMN public.orders_bannos.covering_start_ts IS 'Timestamp when Covering stage started (set by start_covering scan)';
COMMENT ON COLUMN public.orders_bannos.decorating_start_ts IS 'Timestamp when Decorating stage started (set by start_decorating scan)';
COMMENT ON COLUMN public.orders_flourlane.covering_start_ts IS 'Timestamp when Covering stage started (set by start_covering scan)';
COMMENT ON COLUMN public.orders_flourlane.decorating_start_ts IS 'Timestamp when Decorating stage started (set by start_decorating scan)';

-- ============================================================================
-- STEP 2: Update print_barcode to set filling_start_ts on first print
-- (Uncomment the TODO code from migration 054)
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
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  v_table_name := 'orders_' || p_store;
  EXECUTE format(
    'SELECT * FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Set filling_start_ts on first print in Filling stage (was commented out TODO)
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

GRANT EXECUTE ON FUNCTION public.print_barcode(text, text) TO authenticated;

COMMENT ON FUNCTION public.print_barcode IS 'Generate printable ticket payload and log print event. First print in Filling stage sets filling_start_ts.';

-- ============================================================================
-- STEP 3: Create start_covering() RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_covering(
  p_order_id text,
  p_store text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_covering_start_ts timestamptz;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  EXECUTE format('SELECT stage, covering_start_ts FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage, v_covering_start_ts
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_current_stage != 'Covering' THEN
    RAISE EXCEPTION 'Order must be in Covering stage to start covering. Current stage: %', v_current_stage;
  END IF;

  -- Only set if not already set (idempotent)
  IF v_covering_start_ts IS NULL THEN
    EXECUTE format(
      'UPDATE public.%I SET covering_start_ts = now(), updated_at = now() WHERE id = $1',
      v_table_name
    )
    USING p_order_id;
  END IF;

  -- Log to stage_events
  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (
    p_store,
    p_order_id,
    'Covering',
    'start',
    v_user_id,
    now(),
    jsonb_build_object('already_started', v_covering_start_ts IS NOT NULL)
  );

  -- Log to audit_log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'start_covering',
    v_user_id,
    'rpc',
    jsonb_build_object('order_id', p_order_id, 'store', p_store)
  );

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.start_covering(text, text) TO authenticated;

COMMENT ON FUNCTION public.start_covering IS 'Set covering_start_ts when covering staff scans barcode. Idempotent.';

-- ============================================================================
-- STEP 4: Create start_decorating() RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_decorating(
  p_order_id text,
  p_store text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_decorating_start_ts timestamptz;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  EXECUTE format('SELECT stage, decorating_start_ts FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage, v_decorating_start_ts
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_current_stage != 'Decorating' THEN
    RAISE EXCEPTION 'Order must be in Decorating stage to start decorating. Current stage: %', v_current_stage;
  END IF;

  -- Only set if not already set (idempotent)
  IF v_decorating_start_ts IS NULL THEN
    EXECUTE format(
      'UPDATE public.%I SET decorating_start_ts = now(), updated_at = now() WHERE id = $1',
      v_table_name
    )
    USING p_order_id;
  END IF;

  -- Log to stage_events
  INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
  VALUES (
    p_store,
    p_order_id,
    'Decorating',
    'start',
    v_user_id,
    now(),
    jsonb_build_object('already_started', v_decorating_start_ts IS NOT NULL)
  );

  -- Log to audit_log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'start_decorating',
    v_user_id,
    'rpc',
    jsonb_build_object('order_id', p_order_id, 'store', p_store)
  );

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.start_decorating(text, text) TO authenticated;

COMMENT ON FUNCTION public.start_decorating IS 'Set decorating_start_ts when decorating staff scans barcode. Idempotent.';

-- ============================================================================
-- Summary:
-- PRINTER: print_barcode() → filling_start_ts
-- SCANNER: start_covering() → covering_start_ts
-- SCANNER: start_decorating() → decorating_start_ts
-- (packing_start_ts already handled by existing complete_decorating)
-- ============================================================================
