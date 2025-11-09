-- Migration 054: Print Barcode RPC
-- Date: 2025-11-09
-- Task: Master_Task.md - Task 5: Implement print_barcode RPC
--
-- Creates RPC to generate printable ticket payload and log print events.
-- Special behavior: First print in Filling stage can start timer (when Task 8 columns exist).

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
  -- Note: filling_start_ts will be added in Task 8
  -- For now, we just detect if it's Filling stage
  IF v_order.stage = 'Filling' THEN
    v_is_first_filling_print := true;
    
    -- TODO: When Task 8 is complete, add:
    -- IF v_order.filling_start_ts IS NULL THEN
    --   EXECUTE format(
    --     'UPDATE %I SET filling_start_ts = now() WHERE id = $1',
    --     v_table_name
    --   ) USING p_order_id;
    -- END IF;
  END IF;
  
  -- Log print event to stage_events (Task 6 - COMPLETE)
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

-- Add comment
COMMENT ON FUNCTION public.print_barcode IS 'Generate printable ticket payload and log print event to stage_events. Returns JSON with order details for thermal printer.';

