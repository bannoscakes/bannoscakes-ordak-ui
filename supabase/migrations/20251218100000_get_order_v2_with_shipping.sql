-- Migration: Add get_order_v2 RPC with shipping_address
-- Purpose: Extended version of get_order that includes shipping_address for packing slip
-- Note: Original get_order is left unchanged for backward compatibility

BEGIN;

-- Create get_order_v2 function with shipping_address
CREATE OR REPLACE FUNCTION public.get_order_v2(
  p_order_id text,
  p_store text
) RETURNS TABLE(
  id text,
  shopify_order_id bigint,
  shopify_order_number integer,
  human_id text,
  customer_name text,
  product_title text,
  flavour text,
  size text,
  item_qty integer,
  notes text,
  cake_writing text,
  product_image text,
  delivery_method text,
  due_date date,
  stage stage_type,
  priority priority_level,
  storage text,
  assignee_id uuid,
  assignee_name text,
  store text,
  currency character(3),
  total_amount numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  shipping_address jsonb,
  accessories jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_temp, public
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_order_v2(text, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_order_v2 IS 'Extended get_order with shipping_address and accessories for packing slip. Use this for order detail drawer.';

COMMIT;
