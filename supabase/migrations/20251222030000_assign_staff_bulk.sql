-- ============================================================================
-- Migration: Add bulk staff assignment RPC
-- Date: 2025-12-22
--
-- PURPOSE:
-- Optimize bulk staff assignment by providing a single RPC endpoint that
-- handles multiple order assignments in one transaction. This replaces the
-- N+1 pattern of calling assign_staff once per order.
--
-- BENEFITS:
-- - Single network round-trip instead of N
-- - Atomic transaction (all succeed or all fail)
-- - Better performance for large batch assignments
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_staff_bulk(
  p_order_ids text[],
  p_store text,
  p_staff_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_order_id text;
  v_current_stage stage_type;
  v_success_count integer := 0;
BEGIN
  -- Validate store parameter to prevent SQL injection
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate order_ids array is not empty
  IF array_length(p_order_ids, 1) IS NULL OR array_length(p_order_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Order IDs array cannot be empty';
  END IF;

  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Check user existence once for audit_log
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;

  -- Process each order in the array
  FOREACH v_order_id IN ARRAY p_order_ids
  LOOP
    -- Get current stage for logging
    EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
    INTO v_current_stage
    USING v_order_id;

    -- Skip if order not found
    IF v_current_stage IS NULL THEN
      CONTINUE;
    END IF;

    -- Update the order
    EXECUTE format('UPDATE public.%I SET assignee_id = $1, updated_at = now() WHERE id = $2', v_table_name)
    USING p_staff_id, v_order_id;

    -- Log to stage_events
    INSERT INTO public.stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
    VALUES (
      p_store,
      v_order_id,
      v_current_stage,
      'assign',
      v_user_id,
      now(),
      jsonb_build_object('assigned_to', p_staff_id, 'bulk_operation', true)
    );

    -- Log to audit_log only if user exists in public.users
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'assign_staff_bulk',
        v_user_id,
        'rpc',
        jsonb_build_object('order_id', v_order_id, 'store', p_store, 'staff_id', p_staff_id)
      );
    END IF;

    v_success_count := v_success_count + 1;
  END LOOP;

  RETURN v_success_count;
END;
$function$;

COMMENT ON FUNCTION public.assign_staff_bulk IS 'Bulk assign staff to multiple orders in a single transaction. Returns count of successfully assigned orders.';
