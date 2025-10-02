-- ALL_RPCS_CONSOLIDATED.sql
-- Consolidated SQL for Phases 2-9 (All RPC Functions)
-- Apply this after Phase 1 (005_database_infrastructure.sql)

-- =============================================
-- PHASE 2: STAFF MANAGEMENT RPCs
-- =============================================

-- Get all staff members
CREATE OR REPLACE FUNCTION public.get_staff_list(
  p_role text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  phone text,
  email text,
  is_active boolean,
  created_at timestamptz,
  last_login timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    s.full_name,
    s.role,
    s.phone,
    s.email,
    s.is_active,
    s.created_at,
    s.last_login
  FROM public.staff_shared s
  WHERE (p_role IS NULL OR s.role = p_role)
    AND (p_is_active IS NULL OR s.is_active = p_is_active)
  ORDER BY s.full_name;
END;
$$;

-- Assign staff to order
CREATE OR REPLACE FUNCTION public.assign_staff(
  p_order_id text,
  p_store text,
  p_staff_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  EXECUTE format('UPDATE public.%I SET assignee_id = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_staff_id, p_order_id;
  
  RETURN true;
END;
$$;

-- =============================================
-- PHASE 3: QUEUE MANAGEMENT RPCs
-- =============================================

-- Get queue with all filters
CREATE OR REPLACE FUNCTION public.get_queue(
  p_store text DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_assignee_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_storage text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50,
  p_sort_by text DEFAULT 'priority',
  p_sort_order text DEFAULT 'DESC'
)
RETURNS TABLE (
  id text,
  shopify_order_id bigint,
  shopify_order_number integer,
  customer_name text,
  product_title text,
  flavour text,
  notes text,
  currency char(3),
  total_amount numeric(12,2),
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
BEGIN
  IF p_store = 'bannos' OR p_store IS NULL THEN
    RETURN QUERY
    SELECT 
      o.id,
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
      'bannos'::text as store,
      o.created_at,
      o.updated_at,
      COUNT(*) OVER() as total_count
    FROM public.orders_bannos o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE (p_stage IS NULL OR o.stage::text = p_stage)
      AND (p_assignee_id IS NULL OR o.assignee_id = p_assignee_id)
      AND (p_priority IS NULL OR o.priority::text = p_priority)
      AND (p_storage IS NULL OR o.storage = p_storage)
      AND (p_search IS NULL OR 
           o.customer_name ILIKE '%' || p_search || '%' OR 
           o.product_title ILIKE '%' || p_search || '%' OR
           o.id ILIKE '%' || p_search || '%')
    ORDER BY 
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN o.priority END DESC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN o.priority END ASC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      o.created_at ASC
    LIMIT p_limit OFFSET p_offset;
  END IF;

  IF p_store = 'flourlane' OR p_store IS NULL THEN
    RETURN QUERY
    SELECT 
      o.id,
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
      'flourlane'::text as store,
      o.created_at,
      o.updated_at,
      COUNT(*) OVER() as total_count
    FROM public.orders_flourlane o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE (p_stage IS NULL OR o.stage::text = p_stage)
      AND (p_assignee_id IS NULL OR o.assignee_id = p_assignee_id)
      AND (p_priority IS NULL OR o.priority::text = p_priority)
      AND (p_storage IS NULL OR o.storage = p_storage)
      AND (p_search IS NULL OR 
           o.customer_name ILIKE '%' || p_search || '%' OR 
           o.product_title ILIKE '%' || p_search || '%' OR
           o.id ILIKE '%' || p_search || '%')
    ORDER BY 
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN o.priority END DESC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN o.priority END ASC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      o.created_at ASC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;

-- Get queue statistics
CREATE OR REPLACE FUNCTION public.get_queue_stats(
  p_store text
)
RETURNS TABLE (
  total_orders bigint,
  completed_orders bigint,
  in_production bigint,
  unassigned_orders bigint,
  filling_count bigint,
  covering_count bigint,
  decorating_count bigint,
  packing_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      COUNT(*)::bigint as total_orders,
      COUNT(*) FILTER (WHERE stage = ''Complete'')::bigint as completed_orders,
      COUNT(*) FILTER (WHERE stage != ''Complete'')::bigint as in_production,
      COUNT(*) FILTER (WHERE assignee_id IS NULL AND stage != ''Complete'')::bigint as unassigned_orders,
      COUNT(*) FILTER (WHERE stage = ''Filling'')::bigint as filling_count,
      COUNT(*) FILTER (WHERE stage = ''Covering'')::bigint as covering_count,
      COUNT(*) FILTER (WHERE stage = ''Decorating'')::bigint as decorating_count,
      COUNT(*) FILTER (WHERE stage = ''Packing'')::bigint as packing_count
    FROM public.%I
  ', v_table_name);
END;
$$;

-- Get unassigned counts per stage
CREATE OR REPLACE FUNCTION public.get_unassigned_counts(
  p_store text
)
RETURNS TABLE (
  stage text,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      stage::text,
      COUNT(*)::bigint
    FROM public.%I
    WHERE assignee_id IS NULL AND stage != ''Complete''
    GROUP BY stage
    ORDER BY stage
  ', v_table_name);
END;
$$;

-- =============================================
-- PHASE 4: SCANNER & STAGE RPCs
-- =============================================

-- Complete filling stage
CREATE OR REPLACE FUNCTION public.complete_filling(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;
  
  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  IF v_current_stage != 'Filling' THEN
    RAISE EXCEPTION 'Order must be in Filling stage to complete filling';
  END IF;
  
  EXECUTE format('UPDATE public.%I SET stage = ''Covering'', filling_complete_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Filling', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$$;

-- Complete covering stage
CREATE OR REPLACE FUNCTION public.complete_covering(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('UPDATE public.%I SET stage = ''Decorating'', covering_complete_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Covering', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$$;

-- Complete decorating stage
CREATE OR REPLACE FUNCTION public.complete_decorating(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('UPDATE public.%I SET stage = ''Packing'', decorating_complete_ts = now(), packing_start_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Decorating', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$$;

-- Complete packing stage
CREATE OR REPLACE FUNCTION public.complete_packing(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('UPDATE public.%I SET stage = ''Complete'', packing_complete_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Packing', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$$;

-- =============================================
-- PHASE 5: INVENTORY RPCs
-- =============================================

-- Get all components
CREATE OR REPLACE FUNCTION public.get_components()
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  description text,
  category text,
  unit text,
  current_stock numeric,
  min_stock numeric,
  max_stock numeric,
  cost_per_unit numeric,
  supplier text,
  supplier_sku text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.sku, c.name, c.description, c.category, c.unit,
    c.current_stock, c.min_stock, c.max_stock, c.cost_per_unit,
    c.supplier, c.supplier_sku, c.is_active, c.created_at, c.updated_at
  FROM public.components c
  WHERE c.is_active = true
  ORDER BY c.name;
END;
$$;

-- Get low stock components
CREATE OR REPLACE FUNCTION public.get_low_stock_components()
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  current_stock numeric,
  min_stock numeric,
  stock_deficit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.sku,
    c.name,
    c.current_stock,
    c.min_stock,
    (c.min_stock - c.current_stock) as stock_deficit
  FROM public.components c
  WHERE c.is_active = true 
    AND c.current_stock < c.min_stock
  ORDER BY (c.min_stock - c.current_stock) DESC;
END;
$$;

-- =============================================
-- PHASE 6: SETTINGS RPCs
-- =============================================

-- Get all settings for a store
CREATE OR REPLACE FUNCTION public.get_settings(
  p_store text
)
RETURNS TABLE (
  store text,
  key text,
  value jsonb,
  description text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.store, s.key, s.value, s.description, s.created_at, s.updated_at
  FROM public.settings s
  WHERE s.store = p_store
  ORDER BY s.key;
END;
$$;

-- Set a setting value
CREATE OR REPLACE FUNCTION public.set_setting(
  p_store text,
  p_key text,
  p_value jsonb,
  p_description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.settings (store, key, value, description)
  VALUES (p_store, p_key, p_value, p_description)
  ON CONFLICT (store, key) 
  DO UPDATE SET value = p_value, description = COALESCE(p_description, settings.description), updated_at = now();
  
  RETURN true;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_staff_list(text, boolean) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.assign_staff(text, text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_queue(text, text, uuid, text, text, text, integer, integer, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_queue_stats(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_unassigned_counts(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_filling(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_covering(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_decorating(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_packing(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_components() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_low_stock_components() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_settings(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_setting(text, text, jsonb, text) TO authenticated, anon;

