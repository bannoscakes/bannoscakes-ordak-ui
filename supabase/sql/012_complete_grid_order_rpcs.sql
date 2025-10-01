-- 012_complete_grid_order_rpcs.sql
-- Phase 8: Complete Grid & Order Management RPCs
-- Implements completed orders viewing and order editing functions

-- =============================================
-- COMPLETE ORDERS RPCs
-- =============================================

-- Get completed orders with advanced filtering
CREATE OR REPLACE FUNCTION public.get_complete(
  p_store text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50,
  p_sort_by text DEFAULT 'completed_at',
  p_sort_order text DEFAULT 'DESC'
)
RETURNS TABLE (
  id text,
  human_id text,
  shopify_order_id bigint,
  shopify_order_number integer,
  customer_name text,
  product_title text,
  flavour text,
  notes text,
  currency character(3),
  total_amount numeric,
  stage stage_type,
  priority priority_level,
  due_date date,
  delivery_method text,
  size text,
  item_qty integer,
  storage text,
  assignee_id uuid,
  assignee_name text,
  store text,
  packing_complete_ts timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_where_conditions text[] := ARRAY[]::text[];
  v_order_clause text;
  v_query text;
BEGIN
  -- Check if user has permission to view orders
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view completed orders';
  END IF;

  -- Validate store
  IF p_store IS NOT NULL AND p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate sort parameters
  IF p_sort_by NOT IN ('completed_at', 'due_date', 'created_at', 'customer_name', 'product_title') THEN
    RAISE EXCEPTION 'Invalid sort_by: %', p_sort_by;
  END IF;

  IF p_sort_order NOT IN ('ASC', 'DESC') THEN
    RAISE EXCEPTION 'Invalid sort_order: %', p_sort_order;
  END IF;

  -- Build WHERE conditions
  v_where_conditions := array_append(v_where_conditions, 'stage = ''Complete''');

  IF p_start_date IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 
      'packing_complete_ts >= ' || quote_literal(p_start_date));
  END IF;

  IF p_end_date IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 
      'packing_complete_ts <= ' || quote_literal(p_end_date || ' 23:59:59'));
  END IF;

  IF p_search IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 
      '(customer_name ILIKE ' || quote_literal('%' || p_search || '%') || 
      ' OR product_title ILIKE ' || quote_literal('%' || p_search || '%') || 
      ' OR human_id ILIKE ' || quote_literal('%' || p_search || '%') || ')');
  END IF;

  -- Build ORDER BY clause
  CASE p_sort_by
    WHEN 'completed_at' THEN
      v_order_clause := 'packing_complete_ts ' || p_sort_order;
    WHEN 'due_date' THEN
      v_order_clause := 'due_date ' || p_sort_order || ', packing_complete_ts DESC';
    WHEN 'created_at' THEN
      v_order_clause := 'created_at ' || p_sort_order;
    WHEN 'customer_name' THEN
      v_order_clause := 'customer_name ' || p_sort_order || ', packing_complete_ts DESC';
    WHEN 'product_title' THEN
      v_order_clause := 'product_title ' || p_sort_order || ', packing_complete_ts DESC';
  END CASE;

  -- Build the query
  IF p_store IS NOT NULL THEN
    -- Single store query
    v_query := format('
      SELECT 
        o.id,
        o.human_id,
        o.shopify_order_id,
        o.shopify_order_number,
        o.customer_name,
        o.product_title,
        o.flavour,
        o.notes,
        o.currency,
        o.total_amount,
        o.stage,
        o.priority,
        o.due_date,
        o.delivery_method,
        o.size,
        o.item_qty,
        o.storage,
        o.assignee_id,
        s.full_name as assignee_name,
        %L as store,
        o.packing_complete_ts,
        o.created_at,
        o.updated_at,
        COUNT(*) OVER() as total_count
      FROM public.orders_%s o
      LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
      WHERE %s
      ORDER BY %s
      LIMIT %s OFFSET %s
    ', p_store, p_store,
       array_to_string(v_where_conditions, ' AND '),
       v_order_clause, p_limit, p_offset);
  ELSE
    -- Multi-store query
    v_query := format('
      SELECT 
        o.id,
        o.human_id,
        o.shopify_order_id,
        o.shopify_order_number,
        o.customer_name,
        o.product_title,
        o.flavour,
        o.notes,
        o.currency,
        o.total_amount,
        o.stage,
        o.priority,
        o.due_date,
        o.delivery_method,
        o.size,
        o.item_qty,
        o.storage,
        o.assignee_id,
        s.full_name as assignee_name,
        ''bannos'' as store,
        o.packing_complete_ts,
        o.created_at,
        o.updated_at,
        COUNT(*) OVER() as total_count
      FROM public.orders_bannos o
      LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
      WHERE %s
      UNION ALL
      SELECT 
        o.id,
        o.human_id,
        o.shopify_order_id,
        o.shopify_order_number,
        o.customer_name,
        o.product_title,
        o.flavour,
        o.notes,
        o.currency,
        o.total_amount,
        o.stage,
        o.priority,
        o.due_date,
        o.delivery_method,
        o.size,
        o.item_qty,
        o.storage,
        o.assignee_id,
        s.full_name as assignee_name,
        ''flourlane'' as store,
        o.packing_complete_ts,
        o.created_at,
        o.updated_at,
        COUNT(*) OVER() as total_count
      FROM public.orders_flourlane o
      LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
      WHERE %s
      ORDER BY %s
      LIMIT %s OFFSET %s
    ', array_to_string(v_where_conditions, ' AND '),
       array_to_string(v_where_conditions, ' AND '),
       v_order_clause, p_limit, p_offset);
  END IF;

  -- Execute the query
  RETURN QUERY EXECUTE v_query;
END;
$$;

-- =============================================
-- ORDER EDITING RPCs
-- =============================================

-- Update order core fields
CREATE OR REPLACE FUNCTION public.update_order_core(
  p_order_id text,
  p_store text,
  p_customer_name text DEFAULT NULL,
  p_product_title text DEFAULT NULL,
  p_flavour text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_delivery_method text DEFAULT NULL,
  p_size text DEFAULT NULL,
  p_item_qty integer DEFAULT NULL,
  p_storage text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
  v_user_id uuid;
  v_update_parts text[] := ARRAY[]::text[];
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

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Build dynamic UPDATE statement
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

  -- If nothing to update, return early
  IF array_length(v_update_parts, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- Add updated_at
  v_update_parts := array_append(v_update_parts, 'updated_at = now()');

  -- Execute update
  EXECUTE format('UPDATE public.%I SET %s WHERE id = $1', 
    v_table_name, array_to_string(v_update_parts, ', '))
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, actor_id, store, order_id
  ) VALUES (
    v_table_name, p_order_id, 'update_order_core',
    v_old_values, v_new_values, v_user_id, p_store, p_order_id
  );

  RETURN true;
END;
$$;

-- Get complete orders minimal (compatibility wrapper)
CREATE OR REPLACE FUNCTION public.get_complete_minimal(
  p_store text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id text,
  human_id text,
  title text,
  customer_name text,
  due_date date,
  completed_at timestamptz,
  store text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.human_id,
    c.product_title as title,
    c.customer_name,
    c.due_date,
    c.packing_complete_ts as completed_at,
    c.store
  FROM public.get_complete(
    p_store, NULL, NULL, NULL, 0, p_limit, 'completed_at', 'DESC'
  ) c;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

-- Grant execute permissions on all complete grid functions
GRANT EXECUTE ON FUNCTION public.get_complete(text, date, date, text, integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_core(text, text, text, text, text, text, date, text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_complete_minimal(text, integer) TO authenticated;
