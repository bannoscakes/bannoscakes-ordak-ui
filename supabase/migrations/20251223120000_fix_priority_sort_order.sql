-- Migration: Fix priority sorting order in get_queue RPC
-- Issue: Low priority orders appear first when sorting by priority DESC
--
-- Root cause: PostgreSQL ENUM ordering is by definition position:
--   'High' = 0, 'Medium' = 1, 'Low' = 2
-- So DESC sorting puts Low (2) first, which is backwards.
--
-- Fix: Use explicit CASE ordering so High (1) < Medium (2) < Low (3)
-- This ensures DESC gives High → Medium → Low as expected.

BEGIN;

-- Drop and recreate get_queue with fixed priority ordering
DROP FUNCTION IF EXISTS public.get_queue(text, text, uuid, text, text, text, integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.get_queue(
  p_store text DEFAULT NULL::text,
  p_stage text DEFAULT NULL::text,
  p_assignee_id uuid DEFAULT NULL::uuid,
  p_search text DEFAULT NULL::text,
  p_priority text DEFAULT NULL::text,
  p_storage text DEFAULT NULL::text,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50,
  p_sort_by text DEFAULT 'priority'::text,
  p_sort_order text DEFAULT 'DESC'::text
)
RETURNS TABLE(
  id text,
  human_id text,
  shopify_order_id bigint,
  shopify_order_number integer,
  customer_name text,
  product_title text,
  flavour text,
  notes text,
  currency character,
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  covering_start_ts timestamp with time zone,
  decorating_start_ts timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_store = 'bannos' OR p_store IS NULL THEN
    RETURN QUERY
    SELECT
      o.id,
      COALESCE(o.human_id, o.id) as human_id,
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
      o.covering_start_ts,
      o.decorating_start_ts,
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
           o.human_id ILIKE '%' || p_search || '%' OR
           o.id ILIKE '%' || p_search || '%')
    ORDER BY
      -- Priority: Use explicit CASE to get High → Medium → Low ordering
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END ASC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END DESC,
      -- Due date sorting
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      o.created_at ASC
    LIMIT p_limit OFFSET p_offset;
  END IF;

  IF p_store = 'flourlane' OR p_store IS NULL THEN
    RETURN QUERY
    SELECT
      o.id,
      COALESCE(o.human_id, o.id) as human_id,
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
      o.covering_start_ts,
      o.decorating_start_ts,
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
           o.human_id ILIKE '%' || p_search || '%' OR
           o.id ILIKE '%' || p_search || '%')
    ORDER BY
      -- Priority: Use explicit CASE to get High → Medium → Low ordering
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END ASC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END DESC,
      -- Due date sorting
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      o.created_at ASC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$function$;

-- Grant permissions (same as before)
GRANT EXECUTE ON FUNCTION public.get_queue(text, text, uuid, text, text, text, integer, integer, text, text) TO authenticated;

COMMENT ON FUNCTION public.get_queue IS 'Get queue of orders with optional filtering. Includes human_id for #B12345/#F12345 display format. Priority sorts High → Medium → Low.';

COMMIT;
