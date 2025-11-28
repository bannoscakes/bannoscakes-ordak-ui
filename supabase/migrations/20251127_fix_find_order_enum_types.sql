-- Fix find_order RPC: enum type casting issue
-- Bug: stage_type and priority_level enums were not being cast to text
-- Error: "Returned type stage_type does not match expected type text in column 7"

DROP FUNCTION IF EXISTS public.find_order(text);

CREATE FUNCTION public.find_order(
  p_search text
) RETURNS TABLE(
  id text,
  order_number integer,
  product_title text,
  size text,
  customer_name text,
  storage text,
  stage text,
  priority text,  -- Changed from smallint to text (priority_level enum)
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
      o.stage::text,      -- Cast stage_type enum to text
      o.priority::text,   -- Cast priority_level enum to text
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
      o.stage::text,      -- Cast stage_type enum to text
      o.priority::text,   -- Cast priority_level enum to text
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.find_order(text) TO authenticated;

COMMENT ON FUNCTION public.find_order IS 'Universal order search across all stages. Shows current stage, storage, and assignee.';
