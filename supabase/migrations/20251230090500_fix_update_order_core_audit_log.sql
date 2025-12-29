-- Fix update_order_core to use correct audit_log columns
-- Actual columns: id, action, performed_by, source, meta, created_at

CREATE OR REPLACE FUNCTION public.update_order_core(
  p_order_id text,
  p_store text,
  p_customer_name text DEFAULT NULL::text,
  p_product_title text DEFAULT NULL::text,
  p_flavour text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_due_date date DEFAULT NULL::date,
  p_delivery_method text DEFAULT NULL::text,
  p_size text DEFAULT NULL::text,
  p_item_qty integer DEFAULT NULL::integer,
  p_storage text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
  v_user_id uuid;
  v_update_parts text[] := ARRAY[]::text[];
  v_new_priority text;
  v_current_due_date date;
  v_delta_days integer;
BEGIN
  -- Check if user has permission to update orders
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to update orders';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log and due_date
  EXECUTE format('SELECT to_jsonb(o.*), o.due_date FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values, v_current_due_date;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Calculate new priority if due_date is being updated
  IF p_due_date IS NOT NULL THEN
    v_delta_days := p_due_date - CURRENT_DATE;

    IF v_delta_days <= 1 THEN
      v_new_priority := 'High';
    ELSIF v_delta_days <= 3 THEN
      v_new_priority := 'Medium';
    ELSE
      v_new_priority := 'Low';
    END IF;
  END IF;

  -- Build dynamic update statement
  IF p_customer_name IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'customer_name = ' || quote_literal(p_customer_name));
  END IF;

  IF p_product_title IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'product_title = ' || quote_literal(p_product_title));
  END IF;

  IF p_flavour IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'flavour = ' || quote_literal(p_flavour));
  END IF;

  IF p_notes IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'notes = ' || quote_literal(p_notes));
  END IF;

  IF p_due_date IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'due_date = ' || quote_literal(p_due_date));
    v_update_parts := array_append(v_update_parts, 'priority = ' || quote_literal(v_new_priority) || '::priority_level');
  END IF;

  IF p_delivery_method IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'delivery_method = ' || quote_literal(p_delivery_method));
  END IF;

  IF p_size IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'size = ' || quote_literal(p_size));
  END IF;

  IF p_item_qty IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'item_qty = ' || p_item_qty);
  END IF;

  IF p_storage IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'storage = ' || quote_literal(p_storage));
  END IF;

  -- Only update if there are changes
  IF array_length(v_update_parts, 1) > 0 THEN
    v_update_parts := array_append(v_update_parts, 'updated_at = NOW()');

    EXECUTE format(
      'UPDATE public.%I SET %s WHERE id = $1',
      v_table_name,
      array_to_string(v_update_parts, ', ')
    ) USING p_order_id;

    -- Get new values for audit log
    EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
    USING p_order_id INTO v_new_values;

    -- Log the change to audit_log (using correct column structure)
    INSERT INTO public.audit_log (
      action,
      performed_by,
      source,
      meta
    ) VALUES (
      'update_order_core',
      v_user_id,
      v_table_name,
      jsonb_build_object(
        'order_id', p_order_id,
        'store', p_store,
        'old_values', v_old_values,
        'new_values', v_new_values
      )
    );
  END IF;

  RETURN true;
END;
$function$;
