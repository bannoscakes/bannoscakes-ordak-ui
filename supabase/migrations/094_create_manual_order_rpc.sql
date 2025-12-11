-- Migration: create_manual_order RPC
-- Purpose: Allow supervisors/admins to create manual orders for weddings, events, deposits, or testing
-- Date: 2025-12-11

-- ============================================================================
-- CREATE MANUAL ORDER RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_manual_order(
  p_store text,
  p_order_number text,
  p_customer_name text,
  p_product_title text,
  p_size text,
  p_flavour text,
  p_due_date date,
  p_writing_on_cake text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_order_id text;
  v_priority smallint;
  v_delta_days integer;
  v_user_id uuid;
BEGIN
  -- Check if user has permission (Supervisor or Admin)
  IF NOT (public.check_user_role('Supervisor') OR public.check_user_role('Admin')) THEN
    RAISE EXCEPTION 'Insufficient permissions to create manual orders';
  END IF;

  -- Validate store parameter
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %. Must be "bannos" or "flourlane"', p_store;
  END IF;

  -- Validate order number format (B or F followed by digits)
  IF p_order_number !~ '^[BF]\d+$' THEN
    RAISE EXCEPTION 'Invalid order number format: %. Must be B##### for Bannos or F##### for Flourlane', p_order_number;
  END IF;

  -- Validate order number prefix matches store
  IF (p_store = 'bannos' AND p_order_number !~ '^B') OR
     (p_store = 'flourlane' AND p_order_number !~ '^F') THEN
    RAISE EXCEPTION 'Order number prefix must match store (B for bannos, F for flourlane)';
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Generate order ID (use order number as ID for manual orders)
  -- Format: store-ordernumber (e.g., bannos-B20655)
  v_order_id := p_store || '-' || p_order_number;

  -- Calculate priority based on due_date
  -- HIGH (1): today/overdue/tomorrow (deltaDays <= 1)
  -- MEDIUM (0): within 3 days (deltaDays <= 3)
  -- LOW (-1): more than 3 days (deltaDays > 3)
  v_delta_days := p_due_date - CURRENT_DATE;

  IF v_delta_days <= 1 THEN
    v_priority := 1; -- HIGH
  ELSIF v_delta_days <= 3 THEN
    v_priority := 0; -- MEDIUM
  ELSE
    v_priority := -1; -- LOW
  END IF;

  -- Insert the order
  EXECUTE format('
    INSERT INTO public.%I (
      id,
      customer_name,
      product_title,
      size,
      flavour,
      due_date,
      notes,
      cake_writing,
      product_image,
      stage,
      priority,
      delivery_method,
      item_qty,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      ''Filling''::stage_type,
      $10,
      ''Manual'',
      1,
      now(),
      now()
    )
  ', v_table_name)
  USING
    v_order_id,
    p_customer_name,
    p_product_title,
    p_size,
    p_flavour,
    p_due_date,
    p_notes,
    p_writing_on_cake,
    p_image_url,
    v_priority;

  -- Log the action in audit_log
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    new_values,
    actor_id,
    store,
    order_id
  ) VALUES (
    v_table_name,
    v_order_id,
    'create_manual_order',
    jsonb_build_object(
      'order_number', p_order_number,
      'customer_name', p_customer_name,
      'product_title', p_product_title,
      'size', p_size,
      'flavour', p_flavour,
      'due_date', p_due_date,
      'writing_on_cake', p_writing_on_cake,
      'notes', p_notes
    ),
    v_user_id,
    p_store,
    v_order_id
  );

  RETURN v_order_id;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_manual_order(text, text, text, text, text, text, date, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_manual_order IS 'Creates a manual order for weddings, events, deposits, or internal testing. Requires Supervisor or Admin role.';
