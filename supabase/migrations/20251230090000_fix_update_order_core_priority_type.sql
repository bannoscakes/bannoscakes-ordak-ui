-- Fix update_order_core to use priority_level enum instead of integers
-- The priority column is type priority_level ('High', 'Medium', 'Low'), not integer

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
  v_new_priority text;  -- Changed from smallint to text for enum
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
    -- Update priority when due_date changes - cast to enum type
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
    -- Add updated_at timestamp
    v_update_parts := array_append(v_update_parts, 'updated_at = NOW()');

    -- Execute the update
    EXECUTE format(
      'UPDATE public.%I SET %s WHERE id = $1',
      v_table_name,
      array_to_string(v_update_parts, ', ')
    ) USING p_order_id;

    -- Get new values for audit log
    EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
    USING p_order_id INTO v_new_values;

    -- Log the change to audit_log
    INSERT INTO public.audit_log (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      v_table_name,
      p_order_id,
      'update_order_core',
      v_old_values,
      v_new_values,
      v_user_id
    );
  END IF;

  RETURN true;
END;
$function$;
