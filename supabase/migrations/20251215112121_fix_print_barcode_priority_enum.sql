-- ============================================================================
-- Migration: Fix print_barcode priority, stage, and staff_id handling
-- Date: 2025-12-15
--
-- Issues fixed:
-- 1. Priority is smallint (0, 1) - map to semantic strings 'HIGH'/'MEDIUM'/'LOW'
-- 2. Stage is enum - add ::text cast for jsonb payload
-- 3. staff_id FK constraint - check if user exists in staff_shared before INSERT
--
-- Changes:
-- 1. priority: CASE v_order.priority WHEN 1 THEN 'HIGH' WHEN 0 THEN 'MEDIUM' ELSE 'LOW' END
-- 2. stage: v_order.stage::text
-- 3. staff_id: lookup in staff_shared, use NULL if not found (prevents FK violation)
-- 4. meta.auth_uid: always log auth.uid() for audit trail (even if not in staff_shared)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.print_barcode(
  p_store text,
  p_order_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $function$
DECLARE
  v_table_name text;
  v_order record;
  v_is_first_filling_print boolean := false;
  v_payload jsonb;
  v_user_id uuid;
  v_staff_id uuid;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Get order details (explicit columns to surface schema changes)
  v_table_name := 'orders_' || p_store;
  EXECUTE format(
    'SELECT id, shopify_order_number, product_title, size, due_date, customer_name, stage, priority, filling_start_ts FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id INTO v_order;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Validate shopify_order_number is present (required for barcode)
  IF v_order.shopify_order_number IS NULL THEN
    RAISE EXCEPTION 'Cannot print barcode: shopify_order_number is NULL for order %', p_order_id;
  END IF;

  -- Check if this is first print in Filling stage and set filling_start_ts
  -- Cast stage enum to text for comparison
  IF v_order.stage::text = 'Filling' THEN
    v_is_first_filling_print := (v_order.filling_start_ts IS NULL);

    -- Set filling_start_ts on first print (idempotent - doesn't overwrite if already set)
    IF v_order.filling_start_ts IS NULL THEN
      EXECUTE format(
        'UPDATE %I SET filling_start_ts = now() WHERE id = $1',
        v_table_name
      ) USING p_order_id;
    END IF;
  END IF;

  -- Check if user exists in staff_shared (prevents FK violation)
  SELECT user_id INTO v_staff_id FROM public.staff_shared WHERE user_id = v_user_id;

  -- Log print event to stage_events
  -- Cast stage enum to text for stage_events.stage column
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
    v_order.stage::text,
    'print',
    now(),
    v_staff_id,  -- Will be NULL if user not in staff_shared
    jsonb_build_object(
      'first_filling_print', v_is_first_filling_print,
      'auth_uid', v_user_id
    )
  );

  -- Build printable payload
  -- barcode_content matches Shopify Kitchen Barcode metafield: #B25649 for Bannos, #F25649 for Flourlane
  v_payload := jsonb_build_object(
    'order_number', v_order.shopify_order_number,
    'order_id', v_order.id,
    'product_title', v_order.product_title,
    'size', v_order.size,
    'due_date', v_order.due_date,
    'customer_name', v_order.customer_name,
    'stage', v_order.stage::text,
    'priority', CASE v_order.priority
      WHEN 1 THEN 'HIGH'
      WHEN 0 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    'barcode_content', format('#%s%s',
      CASE WHEN p_store = 'bannos' THEN 'B' ELSE 'F' END,
      v_order.shopify_order_number
    ),
    'printed_at', now(),
    'printed_by', v_user_id
  );

  RETURN v_payload;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.print_barcode(text, text) TO authenticated;

COMMENT ON FUNCTION public.print_barcode IS 'Generate printable ticket payload and log print event. Sets filling_start_ts on first print in Filling stage. Barcode format: #B25649 (Bannos) / #F25649 (Flourlane).';
