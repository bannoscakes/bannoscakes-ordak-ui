-- Fix qc_return_to_decorating RPC
-- Changes:
-- 1. Accept text order_id (not UUID)
-- 2. Accept p_store to determine which table (orders_bannos or orders_flourlane)
-- 3. Accept p_notes for reason
-- 4. Update correct table based on store
-- 5. Set stage back to 'Decorating'
-- 6. Clear decorating_complete_ts and packing_start_ts
-- 7. Log to stage_events

-- Drop old function (UUID-based)
DROP FUNCTION IF EXISTS public.qc_return_to_decorating(uuid, text);

-- Create new function with correct signature
CREATE OR REPLACE FUNCTION public.qc_return_to_decorating(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
  v_current_stage text;
  v_user_id uuid;
  v_rows_affected integer;
BEGIN
  -- Validate store parameter
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  -- Get current stage
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Only allow return from Packing stage
  IF v_current_stage != 'Packing' THEN
    RAISE EXCEPTION 'Order must be in Packing stage to return to Decorating. Current stage: %', v_current_stage;
  END IF;

  -- Update order: set stage back to Decorating, clear timestamps
  EXECUTE format(
    'UPDATE public.%I SET
      stage = ''Decorating'',
      decorating_complete_ts = NULL,
      packing_start_ts = NULL,
      updated_at = now()
    WHERE id = $1',
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
    'Packing',
    'qc_return',
    v_user_id,
    now(),
    jsonb_build_object(
      'returned_to', 'Decorating',
      'reason', COALESCE(p_notes, 'QC issue'),
      'notes', p_notes
    )
  );

  -- Log to audit_log if user exists
  IF v_user_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'qc_return_to_decorating',
      v_user_id,
      'rpc',
      jsonb_build_object(
        'order_id', p_order_id,
        'store', p_store,
        'from_stage', 'Packing',
        'to_stage', 'Decorating',
        'notes', p_notes
      )
    );
  END IF;

  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.qc_return_to_decorating(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qc_return_to_decorating(text, text, text) TO service_role;

COMMENT ON FUNCTION public.qc_return_to_decorating(text, text, text)
  IS 'Return order from Packing stage back to Decorating due to QC issue. Clears decorating_complete_ts and packing_start_ts.';
