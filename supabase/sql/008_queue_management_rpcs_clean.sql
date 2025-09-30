-- Phase 4: Queue Management RPCs
-- Enhanced queue functions with filtering, pagination, and search

-- =============================================
-- ENHANCED QUEUE RPCs
-- =============================================

-- Get full queue with advanced filtering and pagination
CREATE OR REPLACE FUNCTION public.get_queue(
  p_store text DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_assignee_id uuid DEFAULT NULL,
  p_storage text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50,
  p_sort_by text DEFAULT 'priority',
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
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_where_conditions text[] := ARRAY[]::text[];
  v_order_clause text;
  v_query text;
BEGIN
  -- Check if user has permission to view queue
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view queue';
  END IF;

  -- Validate store
  IF p_store IS NOT NULL AND p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate stage
  IF p_stage IS NOT NULL AND p_stage NOT IN ('Filling', 'Covering', 'Decorating', 'Packing', 'Complete') THEN
    RAISE EXCEPTION 'Invalid stage: %', p_stage;
  END IF;

  -- Validate priority
  IF p_priority IS NOT NULL AND p_priority NOT IN ('High', 'Medium', 'Low') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  -- Validate sort parameters
  IF p_sort_by NOT IN ('priority', 'due_date', 'created_at', 'customer_name', 'product_title') THEN
    RAISE EXCEPTION 'Invalid sort_by: %', p_sort_by;
  END IF;

  IF p_sort_order NOT IN ('ASC', 'DESC') THEN
    RAISE EXCEPTION 'Invalid sort_order: %', p_sort_order;
  END IF;

  -- Set table name based on store
  IF p_store IS NOT NULL THEN
    v_table_name := 'orders_' || p_store;
  ELSE
    -- If no store specified, we'll need to use a UNION approach
    v_table_name := 'orders_bannos'; -- We'll handle this in the query
  END IF;

  -- Build WHERE conditions
  IF p_stage IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 'stage = ' || quote_literal(p_stage));
  END IF;

  IF p_assignee_id IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 'assignee_id = ' || quote_literal(p_assignee_id));
  END IF;

  IF p_storage IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 'storage = ' || quote_literal(p_storage));
  END IF;

  IF p_priority IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 'priority = ' || quote_literal(p_priority));
  END IF;

  IF p_search IS NOT NULL THEN
    v_where_conditions := array_append(v_where_conditions, 
      '(customer_name ILIKE ' || quote_literal('%' || p_search || '%') || 
      ' OR product_title ILIKE ' || quote_literal('%' || p_search || '%') || 
      ' OR notes ILIKE ' || quote_literal('%' || p_search || '%') || ')');
  END IF;

  -- Build ORDER BY clause
  CASE p_sort_by
    WHEN 'priority' THEN
      v_order_clause := 'priority DESC, due_date ASC, created_at ASC';
    WHEN 'due_date' THEN
      v_order_clause := 'due_date ' || p_sort_order || ', priority DESC, created_at ASC';
    WHEN 'created_at' THEN
      v_order_clause := 'created_at ' || p_sort_order || ', priority DESC, due_date ASC';
    WHEN 'customer_name' THEN
      v_order_clause := 'customer_name ' || p_sort_order || ', priority DESC, due_date ASC';
    WHEN 'product_title' THEN
      v_order_clause := 'product_title ' || p_sort_order || ', priority DESC, due_date ASC';
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
        o.created_at,
        o.updated_at,
        COUNT(*) OVER() as total_count
      FROM public.%I o
      LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
      %s
      ORDER BY %s
      LIMIT %s OFFSET %s
    ', p_store, v_table_name,
       CASE WHEN array_length(v_where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(v_where_conditions, ' AND ')
            ELSE '' END,
       v_order_clause, p_limit, p_offset);
  ELSE
    -- Multi-store query (UNION)
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
        o.created_at,
        o.updated_at,
        COUNT(*) OVER() as total_count
      FROM public.orders_bannos o
      LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
      %s
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
        o.created_at,
        o.updated_at,
        COUNT(*) OVER() as total_count
      FROM public.orders_flourlane o
      LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
      %s
      ORDER BY %s
      LIMIT %s OFFSET %s
    ', CASE WHEN array_length(v_where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(v_where_conditions, ' AND ')
            ELSE '' END,
       CASE WHEN array_length(v_where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(v_where_conditions, ' AND ')
            ELSE '' END,
       v_order_clause, p_limit, p_offset);
  END IF;

  -- Execute the query
  RETURN QUERY EXECUTE v_query;
END;
$$;

-- Get queue statistics and counts
CREATE OR REPLACE FUNCTION public.get_queue_stats(
  p_store text DEFAULT NULL
)
RETURNS TABLE (
  total_orders bigint,
  filling_count bigint,
  covering_count bigint,
  decorating_count bigint,
  packing_count bigint,
  complete_count bigint,
  unassigned_count bigint,
  high_priority_count bigint,
  overdue_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query text;
BEGIN
  -- Check if user has permission to view stats
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view queue stats';
  END IF;

  -- Validate store
  IF p_store IS NOT NULL AND p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  IF p_store IS NOT NULL THEN
    -- Single store stats
    v_query := format('
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE stage = ''Filling'') as filling_count,
        COUNT(*) FILTER (WHERE stage = ''Covering'') as covering_count,
        COUNT(*) FILTER (WHERE stage = ''Decorating'') as decorating_count,
        COUNT(*) FILTER (WHERE stage = ''Packing'') as packing_count,
        COUNT(*) FILTER (WHERE stage = ''Complete'') as complete_count,
        COUNT(*) FILTER (WHERE assignee_id IS NULL) as unassigned_count,
        COUNT(*) FILTER (WHERE priority = ''High'') as high_priority_count,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND stage != ''Complete'') as overdue_count
      FROM public.orders_%s
    ', p_store);
  ELSE
    -- Multi-store stats
    v_query := '
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE stage = ''Filling'') as filling_count,
        COUNT(*) FILTER (WHERE stage = ''Covering'') as covering_count,
        COUNT(*) FILTER (WHERE stage = ''Decorating'') as decorating_count,
        COUNT(*) FILTER (WHERE stage = ''Packing'') as packing_count,
        COUNT(*) FILTER (WHERE stage = ''Complete'') as complete_count,
        COUNT(*) FILTER (WHERE assignee_id IS NULL) as unassigned_count,
        COUNT(*) FILTER (WHERE priority = ''High'') as high_priority_count,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND stage != ''Complete'') as overdue_count
      FROM (
        SELECT stage, assignee_id, priority, due_date FROM public.orders_bannos
        UNION ALL
        SELECT stage, assignee_id, priority, due_date FROM public.orders_flourlane
      ) combined
    ';
  END IF;

  RETURN QUERY EXECUTE v_query;
END;
$$;

-- Get unassigned orders count by stage
CREATE OR REPLACE FUNCTION public.get_unassigned_counts(
  p_store text DEFAULT NULL
)
RETURNS TABLE (
  stage stage_type,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query text;
BEGIN
  -- Check if user has permission to view counts
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view unassigned counts';
  END IF;

  -- Validate store
  IF p_store IS NOT NULL AND p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  IF p_store IS NOT NULL THEN
    -- Single store counts
    v_query := format('
      SELECT stage, COUNT(*) as count
      FROM public.orders_%s
      WHERE assignee_id IS NULL AND stage != ''Complete''
      GROUP BY stage
      ORDER BY 
        CASE stage 
          WHEN ''Filling'' THEN 1
          WHEN ''Covering'' THEN 2
          WHEN ''Decorating'' THEN 3
          WHEN ''Packing'' THEN 4
        END
    ', p_store);
  ELSE
    -- Multi-store counts
    v_query := '
      SELECT stage, COUNT(*) as count
      FROM (
        SELECT stage FROM public.orders_bannos WHERE assignee_id IS NULL AND stage != ''Complete''
        UNION ALL
        SELECT stage FROM public.orders_flourlane WHERE assignee_id IS NULL AND stage != ''Complete''
      ) combined
      GROUP BY stage
      ORDER BY 
        CASE stage 
          WHEN ''Filling'' THEN 1
          WHEN ''Covering'' THEN 2
          WHEN ''Decorating'' THEN 3
          WHEN ''Packing'' THEN 4
        END
    ';
  END IF;

  RETURN QUERY EXECUTE v_query;
END;
$$;

-- Set storage location for an order
CREATE OR REPLACE FUNCTION public.set_storage(
  p_order_id text,
  p_store text,
  p_storage_location text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to set storage
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to set storage';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update storage location
  EXECUTE format('UPDATE public.%I SET storage = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_storage_location, p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'set_storage',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Get orders by assignee
CREATE OR REPLACE FUNCTION public.get_orders_by_assignee(
  p_assignee_id uuid,
  p_store text DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id text,
  human_id text,
  customer_name text,
  product_title text,
  stage stage_type,
  priority priority_level,
  due_date date,
  storage text,
  store text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query text;
BEGIN
  -- Check if user has permission to view orders
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view orders';
  END IF;

  -- Validate store
  IF p_store IS NOT NULL AND p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate stage
  IF p_stage IS NOT NULL AND p_stage NOT IN ('Filling', 'Covering', 'Decorating', 'Packing', 'Complete') THEN
    RAISE EXCEPTION 'Invalid stage: %', p_stage;
  END IF;

  IF p_store IS NOT NULL THEN
    -- Single store query
    v_query := format('
      SELECT 
        o.id,
        o.human_id,
        o.customer_name,
        o.product_title,
        o.stage,
        o.priority,
        o.due_date,
        o.storage,
        %L as store,
        o.created_at
      FROM public.orders_%s o
      WHERE o.assignee_id = $1
        %s
      ORDER BY o.priority DESC, o.due_date ASC, o.created_at ASC
      LIMIT %s
    ', p_store, p_store,
       CASE WHEN p_stage IS NOT NULL 
            THEN 'AND o.stage = ' || quote_literal(p_stage)
            ELSE '' END,
       p_limit);
  ELSE
    -- Multi-store query
    v_query := format('
      SELECT 
        o.id,
        o.human_id,
        o.customer_name,
        o.product_title,
        o.stage,
        o.priority,
        o.due_date,
        o.storage,
        ''bannos'' as store,
        o.created_at
      FROM public.orders_bannos o
      WHERE o.assignee_id = $1
        %s
      UNION ALL
      SELECT 
        o.id,
        o.human_id,
        o.customer_name,
        o.product_title,
        o.stage,
        o.priority,
        o.due_date,
        o.storage,
        ''flourlane'' as store,
        o.created_at
      FROM public.orders_flourlane o
      WHERE o.assignee_id = $1
        %s
      ORDER BY priority DESC, due_date ASC, created_at ASC
      LIMIT %s
    ', CASE WHEN p_stage IS NOT NULL 
            THEN 'AND o.stage = ' || quote_literal(p_stage)
            ELSE '' END,
       CASE WHEN p_stage IS NOT NULL 
            THEN 'AND o.stage = ' || quote_literal(p_stage)
            ELSE '' END,
       p_limit);
  END IF;

  RETURN QUERY EXECUTE v_query USING p_assignee_id;
END;
$$;

-- =============================================
-- COMPATIBILITY WRAPPERS
-- =============================================

-- Update existing get_queue_minimal to use new get_queue
CREATE OR REPLACE FUNCTION public.get_queue_minimal(
  p_store text DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id text,
  human_id text,
  title text,
  stage stage_type,
  priority priority_level,
  due_date date,
  assignee_id uuid,
  storage text,
  store text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a compatibility wrapper that calls the new get_queue function
  RETURN QUERY
  SELECT 
    q.id,
    q.human_id,
    q.product_title as title,
    q.stage,
    q.priority,
    q.due_date,
    q.assignee_id,
    q.storage,
    q.store,
    q.created_at
  FROM public.get_queue(
    p_store, p_stage, NULL, NULL, NULL, NULL, 0, p_limit, 'priority', 'DESC'
  ) q;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

-- Grant execute permissions on all queue management functions
GRANT EXECUTE ON FUNCTION public.get_queue(text, text, uuid, text, text, text, integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unassigned_counts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_storage(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_orders_by_assignee(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_minimal(text, text, integer) TO authenticated;
