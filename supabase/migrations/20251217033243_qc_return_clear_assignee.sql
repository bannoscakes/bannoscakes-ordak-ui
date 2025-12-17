-- Update qc_return_to_decorating to clear assignee_id
-- Same pattern as complete_filling, complete_covering, complete_decorating
-- When order returns to Decorating, it should go back to queue unassigned

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

  -- Check order exists first (for better error message)
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Atomic update: only update if still in Packing stage (prevents TOCTOU race)
  -- The WHERE clause ensures we only update if stage hasn't changed concurrently
  -- Clear assignee_id so order goes back to unassigned queue
  EXECUTE format(
    'UPDATE public.%I SET
      stage = ''Decorating'',
      assignee_id = NULL,
      decorating_complete_ts = NULL,
      packing_start_ts = NULL,
      updated_at = now()
    WHERE id = $1 AND stage = ''Packing''',
    v_table_name
  )
  USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    -- Re-fetch current stage for accurate error message
    EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
    INTO v_current_stage
    USING p_order_id;
    RAISE EXCEPTION 'Order must be in Packing stage to return to Decorating. Current stage: %', v_current_stage;
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
      'notes', p_notes,
      'assignee_cleared', true
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
        'notes', p_notes,
        'assignee_cleared', true
      )
    );
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.qc_return_to_decorating(text, text, text)
  IS 'Return order from Packing stage back to Decorating due to QC issue. Clears assignee_id, decorating_complete_ts, and packing_start_ts.';
