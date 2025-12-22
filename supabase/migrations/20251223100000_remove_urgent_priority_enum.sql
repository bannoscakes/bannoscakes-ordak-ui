-- Migration: Remove unused 'Urgent' value from priority_level enum
-- Issue: #455
--
-- The 'Urgent' enum value was added but never used. This migration removes it
-- to keep the schema clean. The system uses only High, Medium, Low priorities.

-- 1. Safety check: Verify no data uses 'Urgent' (will fail if any exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders_bannos WHERE priority = 'Urgent') THEN
    RAISE EXCEPTION 'Cannot remove Urgent: orders_bannos has rows using it';
  END IF;
  IF EXISTS (SELECT 1 FROM orders_flourlane WHERE priority = 'Urgent') THEN
    RAISE EXCEPTION 'Cannot remove Urgent: orders_flourlane has rows using it';
  END IF;
END $$;

-- 2. Drop functions that depend on the enum
DROP FUNCTION IF EXISTS public.get_order(text, text);
DROP FUNCTION IF EXISTS public.get_queue(text, text, uuid, text, text, text, integer, integer, text, text);
DROP FUNCTION IF EXISTS public.get_order_v2(text, text);

-- 3. Drop default constraints
ALTER TABLE orders_bannos ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE orders_flourlane ALTER COLUMN priority DROP DEFAULT;

-- 4. Rename old enum
ALTER TYPE priority_level RENAME TO priority_level_old;

-- 5. Create new enum without 'Urgent'
CREATE TYPE priority_level AS ENUM ('High', 'Medium', 'Low');

-- 6. Update columns to use new enum
ALTER TABLE orders_bannos
  ALTER COLUMN priority TYPE priority_level
  USING priority::text::priority_level;

ALTER TABLE orders_flourlane
  ALTER COLUMN priority TYPE priority_level
  USING priority::text::priority_level;

-- 7. Restore default values
ALTER TABLE orders_bannos
  ALTER COLUMN priority SET DEFAULT 'Medium'::priority_level;

ALTER TABLE orders_flourlane
  ALTER COLUMN priority SET DEFAULT 'Medium'::priority_level;

-- 8. Drop old enum
DROP TYPE priority_level_old;

-- 9. Recreate get_order function
CREATE OR REPLACE FUNCTION public.get_order(p_order_id text, p_store text)
 RETURNS TABLE(id text, shopify_order_id bigint, shopify_order_number integer, human_id text, customer_name text, product_title text, flavour text, size text, item_qty integer, notes text, cake_writing text, product_image text, delivery_method text, due_date date, stage stage_type, priority priority_level, storage text, assignee_id uuid, assignee_name text, store text, currency character, total_amount numeric, accessories jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RAISE EXCEPTION 'Order ID is required';
  END IF;

  IF p_store IS NULL OR p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Store must be "bannos" or "flourlane"';
  END IF;

  IF p_store = 'bannos' THEN
    RETURN QUERY
    SELECT
      o.id,
      o.shopify_order_id,
      o.shopify_order_number,
      o.human_id,
      o.customer_name,
      o.product_title,
      o.flavour,
      o.size,
      o.item_qty,
      o.notes,
      o.cake_writing,
      o.product_image,
      o.delivery_method,
      o.due_date,
      o.stage,
      o.priority,
      o.storage,
      o.assignee_id,
      s.full_name as assignee_name,
      'bannos'::text as store,
      o.currency,
      o.total_amount,
      o.accessories,
      o.created_at,
      o.updated_at
    FROM public.orders_bannos o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE o.id = p_order_id;
  ELSE
    RETURN QUERY
    SELECT
      o.id,
      o.shopify_order_id,
      o.shopify_order_number,
      o.human_id,
      o.customer_name,
      o.product_title,
      o.flavour,
      o.size,
      o.item_qty,
      o.notes,
      o.cake_writing,
      o.product_image,
      o.delivery_method,
      o.due_date,
      o.stage,
      o.priority,
      o.storage,
      o.assignee_id,
      s.full_name as assignee_name,
      'flourlane'::text as store,
      o.currency,
      o.total_amount,
      o.accessories,
      o.created_at,
      o.updated_at
    FROM public.orders_flourlane o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE o.id = p_order_id;
  END IF;
END;
$function$;

-- 10. Recreate get_queue function
CREATE OR REPLACE FUNCTION public.get_queue(p_store text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_assignee_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_priority text DEFAULT NULL::text, p_storage text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50, p_sort_by text DEFAULT 'priority'::text, p_sort_order text DEFAULT 'DESC'::text)
 RETURNS TABLE(id text, shopify_order_id bigint, shopify_order_number integer, customer_name text, product_title text, flavour text, notes text, currency character, total_amount numeric, stage stage_type, priority priority_level, due_date date, delivery_method text, size text, item_qty integer, storage text, assignee_id uuid, assignee_name text, store text, created_at timestamp with time zone, updated_at timestamp with time zone, covering_start_ts timestamp with time zone, decorating_start_ts timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  $function$;

-- 11. Recreate get_order_v2 function
CREATE OR REPLACE FUNCTION public.get_order_v2(p_order_id text, p_store text)
 RETURNS TABLE(id text, shopify_order_id bigint, shopify_order_number integer, human_id text, customer_name text, product_title text, flavour text, size text, item_qty integer, notes text, cake_writing text, product_image text, delivery_method text, due_date date, stage stage_type, priority priority_level, storage text, assignee_id uuid, assignee_name text, store text, currency character, total_amount numeric, created_at timestamp with time zone, updated_at timestamp with time zone, shipping_address jsonb, accessories jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_temp', 'public'
AS $function$
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RAISE EXCEPTION 'Order ID is required';
  END IF;

  IF p_store IS NULL OR p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Store must be "bannos" or "flourlane"';
  END IF;

  IF p_store = 'bannos' THEN
    RETURN QUERY
    SELECT
      o.id,
      o.shopify_order_id,
      o.shopify_order_number,
      o.human_id,
      o.customer_name,
      o.product_title,
      o.flavour,
      o.size,
      o.item_qty,
      o.notes,
      o.cake_writing,
      o.product_image,
      o.delivery_method,
      o.due_date,
      o.stage,
      o.priority,
      o.storage,
      o.assignee_id,
      s.full_name as assignee_name,
      'bannos'::text as store,
      o.currency,
      o.total_amount,
      o.created_at,
      o.updated_at,
      o.order_json->'shipping_address' as shipping_address,
      o.accessories
    FROM public.orders_bannos o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE o.id = p_order_id;
  ELSE
    RETURN QUERY
    SELECT
      o.id,
      o.shopify_order_id,
      o.shopify_order_number,
      o.human_id,
      o.customer_name,
      o.product_title,
      o.flavour,
      o.size,
      o.item_qty,
      o.notes,
      o.cake_writing,
      o.product_image,
      o.delivery_method,
      o.due_date,
      o.stage,
      o.priority,
      o.storage,
      o.assignee_id,
      s.full_name as assignee_name,
      'flourlane'::text as store,
      o.currency,
      o.total_amount,
      o.created_at,
      o.updated_at,
      o.order_json->'shipping_address' as shipping_address,
      o.accessories
    FROM public.orders_flourlane o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE o.id = p_order_id;
  END IF;
END;
$function$;
