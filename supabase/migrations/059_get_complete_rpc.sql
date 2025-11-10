-- Migration: Task 15 - Create universal find_order RPC
-- Purpose: Enable universal order search across all stages (production + complete)
-- Used by: Header search + QuickActions "Find Order" + future public lookup

BEGIN;

-- Universal order search across all stages
CREATE OR REPLACE FUNCTION public.find_order(
  p_search text
) RETURNS TABLE(
  id text,
  order_number integer,
  product_title text,
  size text,
  customer_name text,
  storage text,
  stage text,
  priority smallint,
  delivery_method text,
  due_date date,
  assignee_name text,
  store text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_search IS NULL OR trim(p_search) = '' THEN
    RAISE EXCEPTION 'Search term required';
  END IF;
  
  -- Search both stores across ALL stages
  RETURN QUERY
  SELECT * FROM (
    SELECT 
      o.id,
      o.shopify_order_number::integer as order_number,
      o.product_title,
      o.size,
      o.customer_name,
      o.storage,
      o.stage,
      o.priority,
      o.delivery_method,
      o.due_date,
      s.full_name as assignee_name,
      'bannos'::text as store
    FROM orders_bannos o
    LEFT JOIN staff_shared s ON s.user_id = o.assignee_id
    WHERE o.shopify_order_number::text ILIKE p_search || '%'
       OR o.id ILIKE '%' || p_search || '%'
       OR o.product_title ILIKE '%' || p_search || '%'
       OR o.customer_name ILIKE '%' || p_search || '%'
    
    UNION ALL
    
    SELECT 
      o.id,
      o.shopify_order_number::integer as order_number,
      o.product_title,
      o.size,
      o.customer_name,
      o.storage,
      o.stage,
      o.priority,
      o.delivery_method,
      o.due_date,
      s.full_name as assignee_name,
      'flourlane'::text as store
    FROM orders_flourlane o
    LEFT JOIN staff_shared s ON s.user_id = o.assignee_id
    WHERE o.shopify_order_number::text ILIKE p_search || '%'
       OR o.id ILIKE '%' || p_search || '%'
       OR o.product_title ILIKE '%' || p_search || '%'
       OR o.customer_name ILIKE '%' || p_search || '%'
  ) combined
  ORDER BY order_number DESC
  LIMIT 10;
END;
$function$;

-- Also keep get_complete for backward compatibility (completed orders only)
CREATE OR REPLACE FUNCTION public.get_complete(
  p_store text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50,
  p_sort_by text DEFAULT 'completed_at',
  p_sort_order text DEFAULT 'DESC'
) RETURNS TABLE(
  id text,
  order_number integer,
  product_title text,
  size text,
  customer_name text,
  storage text,
  priority smallint,
  delivery_method text,
  due_date date,
  packing_complete_ts timestamptz,
  assignee_name text,
  store text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_store IS NOT NULL AND p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  RETURN QUERY
  SELECT * FROM (
    SELECT 
      o.id,
      o.shopify_order_number::integer as order_number,
      o.product_title,
      o.size,
      o.customer_name,
      o.storage,
      o.priority,
      o.delivery_method,
      o.due_date,
      o.packing_complete_ts,
      s.full_name as assignee_name,
      'bannos'::text as store
    FROM orders_bannos o
    LEFT JOIN staff_shared s ON s.user_id = o.assignee_id
    WHERE o.stage = 'Complete'
      AND (p_store IS NULL OR p_store = 'bannos')
      AND (p_start_date IS NULL OR DATE(o.packing_complete_ts) >= p_start_date)
      AND (p_end_date IS NULL OR DATE(o.packing_complete_ts) <= p_end_date)
      AND (p_search IS NULL OR 
           o.shopify_order_number::text ILIKE p_search || '%' OR
           o.id ILIKE '%' || p_search || '%' OR
           o.product_title ILIKE '%' || p_search || '%' OR
           o.customer_name ILIKE '%' || p_search || '%')
    
    UNION ALL
    
    SELECT 
      o.id,
      o.shopify_order_number::integer as order_number,
      o.product_title,
      o.size,
      o.customer_name,
      o.storage,
      o.priority,
      o.delivery_method,
      o.due_date,
      o.packing_complete_ts,
      s.full_name as assignee_name,
      'flourlane'::text as store
    FROM orders_flourlane o
    LEFT JOIN staff_shared s ON s.user_id = o.assignee_id
    WHERE o.stage = 'Complete'
      AND (p_store IS NULL OR p_store = 'flourlane')
      AND (p_start_date IS NULL OR DATE(o.packing_complete_ts) >= p_start_date)
      AND (p_end_date IS NULL OR DATE(o.packing_complete_ts) <= p_end_date)
      AND (p_search IS NULL OR 
           o.shopify_order_number::text ILIKE p_search || '%' OR
           o.id ILIKE '%' || p_search || '%' OR
           o.product_title ILIKE '%' || p_search || '%' OR
           o.customer_name ILIKE '%' || p_search || '%')
  ) combined
  ORDER BY 
    CASE WHEN p_sort_by = 'completed_at' AND p_sort_order = 'DESC' THEN packing_complete_ts END DESC,
    CASE WHEN p_sort_by = 'completed_at' AND p_sort_order = 'ASC' THEN packing_complete_ts END ASC,
    CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN due_date END DESC,
    CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN due_date END ASC,
    CASE WHEN p_sort_by = 'customer_name' AND p_sort_order = 'DESC' THEN customer_name END DESC,
    CASE WHEN p_sort_by = 'customer_name' AND p_sort_order = 'ASC' THEN customer_name END ASC,
    CASE WHEN p_sort_by = 'product_title' AND p_sort_order = 'DESC' THEN product_title END DESC,
    CASE WHEN p_sort_by = 'product_title' AND p_sort_order = 'ASC' THEN product_title END ASC,
    packing_complete_ts DESC  -- fallback default
  OFFSET p_offset
  LIMIT p_limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.find_order(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_complete(text, date, date, text, integer, integer, text, text) TO authenticated;

COMMENT ON FUNCTION public.find_order IS 'Universal order search across all stages. Shows current stage, storage, and assignee.';
COMMENT ON FUNCTION public.get_complete IS 'Search completed orders only. Used for completed orders list views.';

COMMIT;

