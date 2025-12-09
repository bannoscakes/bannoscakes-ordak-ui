-- ============================================================================
-- Migration 089: Restore Timestamp Logic
-- Date: 2025-12-09
--
-- CONTEXT:
-- - Migration 043 originally set *_complete_ts timestamps in complete_* functions
-- - Migration 053 accidentally removed timestamp logic when adding stage_events
-- - Migration 054 created print_barcode() with filling_start_ts commented out
-- - This migration RESTORES the timestamp logic without changing anything else
--
-- CHANGES:
-- 1. Add missing columns: covering_start_ts, decorating_start_ts
-- 2. Restore timestamp setting in complete_* UPDATE statements
-- 3. Fix print_barcode() to set filling_start_ts
-- 4. Create start_covering() and start_decorating() functions
-- 5. Update stage_events CHECK to allow 'start' event type
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns
-- ============================================================================

ALTER TABLE public.orders_bannos
ADD COLUMN IF NOT EXISTS covering_start_ts timestamptz;

ALTER TABLE public.orders_bannos
ADD COLUMN IF NOT EXISTS decorating_start_ts timestamptz;

ALTER TABLE public.orders_flourlane
ADD COLUMN IF NOT EXISTS covering_start_ts timestamptz;

ALTER TABLE public.orders_flourlane
ADD COLUMN IF NOT EXISTS decorating_start_ts timestamptz;

COMMENT ON COLUMN public.orders_bannos.covering_start_ts IS 'Timestamp when Covering stage started';
COMMENT ON COLUMN public.orders_bannos.decorating_start_ts IS 'Timestamp when Decorating stage started';
COMMENT ON COLUMN public.orders_flourlane.covering_start_ts IS 'Timestamp when Covering stage started';
COMMENT ON COLUMN public.orders_flourlane.decorating_start_ts IS 'Timestamp when Decorating stage started';

-- ============================================================================
-- STEP 2: Update stage_events CHECK constraint to allow 'start' event type
-- ============================================================================

ALTER TABLE public.stage_events
DROP CONSTRAINT IF EXISTS stage_events_event_type_check;

ALTER TABLE public.stage_events
ADD CONSTRAINT stage_events_event_type_check
CHECK (event_type = ANY (ARRAY['assign'::text, 'complete'::text, 'print'::text, 'start'::text]));

-- ============================================================================
-- STEP 3: Restore complete_filling with filling_complete_ts
-- ONLY CHANGE: Added "filling_complete_ts = now()," to UPDATE statement
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

  -- Update order stage (RESTORED: filling_complete_ts = now())
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Covering'', filling_complete_ts = now(), updated_at = now() WHERE id = $1',
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
-- STEP 4: Restore complete_covering with covering_complete_ts
-- ONLY CHANGE: Added "covering_complete_ts = now()," to UPDATE statement
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

  -- Update order stage (RESTORED: covering_complete_ts = now())
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Decorating'', covering_complete_ts = now(), updated_at = now() WHERE id = $1',
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
-- STEP 5: Restore complete_decorating with decorating_complete_ts + packing_start_ts
-- ONLY CHANGE: Added "decorating_complete_ts = now(), packing_start_ts = now()," to UPDATE
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

  -- Update order stage (RESTORED: decorating_complete_ts = now(), packing_start_ts = now())
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Packing'', decorating_complete_ts = now(), packing_start_ts = now(), updated_at = now() WHERE id = $1',
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
-- STEP 6: Restore complete_packing with packing_complete_ts
-- ONLY CHANGE: Added "packing_complete_ts = now()," to UPDATE statement
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

  -- Update order stage (RESTORED: packing_complete_ts = now())
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Complete'', packing_complete_ts = now(), updated_at = now() WHERE id = $1',
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
-- STEP 7: Fix print_barcode to set filling_start_ts (uncomment the TODO logic)
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

  -- Check if this is first print in Filling stage and set filling_start_ts
  IF v_order.stage = 'Filling' THEN
    v_is_first_filling_print := (v_order.filling_start_ts IS NULL);

    -- Set filling_start_ts on first print (RESTORED - was commented out)
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

COMMENT ON FUNCTION public.print_barcode IS 'Generate printable ticket payload and log print event. Sets filling_start_ts on first print in Filling stage.';

-- ============================================================================
-- STEP 8: Create start_covering function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_covering(
  p_store text,
  p_order_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
  v_user_id uuid;
  v_order_exists boolean;
  v_already_set boolean;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_table_name := 'orders_' || p_store;

  -- Check if order exists
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I WHERE id = $1)',
    v_table_name
  ) USING p_order_id INTO v_order_exists;

  IF NOT v_order_exists THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Check if already set (idempotent)
  EXECUTE format(
    'SELECT covering_start_ts IS NOT NULL FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id INTO v_already_set;

  IF v_already_set THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Covering already started',
      'skipped', true
    );
  END IF;

  -- Set covering_start_ts
  EXECUTE format(
    'UPDATE %I SET covering_start_ts = now() WHERE id = $1',
    v_table_name
  ) USING p_order_id;

  -- Log to stage_events
  INSERT INTO public.stage_events (store, order_id, stage, event_type, at_ts, staff_id)
  VALUES (p_store, p_order_id, 'Covering', 'start', now(), v_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Covering started',
    'covering_start_ts', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_covering(text, text) TO authenticated;

COMMENT ON FUNCTION public.start_covering IS 'Scanner calls this to set covering_start_ts when staff starts covering stage.';

-- ============================================================================
-- STEP 9: Create start_decorating function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_decorating(
  p_store text,
  p_order_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
  v_user_id uuid;
  v_order_exists boolean;
  v_already_set boolean;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_table_name := 'orders_' || p_store;

  -- Check if order exists
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I WHERE id = $1)',
    v_table_name
  ) USING p_order_id INTO v_order_exists;

  IF NOT v_order_exists THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Check if already set (idempotent)
  EXECUTE format(
    'SELECT decorating_start_ts IS NOT NULL FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id INTO v_already_set;

  IF v_already_set THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Decorating already started',
      'skipped', true
    );
  END IF;

  -- Set decorating_start_ts
  EXECUTE format(
    'UPDATE %I SET decorating_start_ts = now() WHERE id = $1',
    v_table_name
  ) USING p_order_id;

  -- Log to stage_events
  INSERT INTO public.stage_events (store, order_id, stage, event_type, at_ts, staff_id)
  VALUES (p_store, p_order_id, 'Decorating', 'start', now(), v_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Decorating started',
    'decorating_start_ts', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_decorating(text, text) TO authenticated;

COMMENT ON FUNCTION public.start_decorating IS 'Scanner calls this to set decorating_start_ts when staff starts decorating stage.';
