-- Migration: Orders Management Infrastructure
-- Issue: #395, #514
--
-- Adds:
-- 1. cancelled_at column to both order tables
-- 2. cancel_order RPC (sets stage='Complete' + cancelled_at=NOW())
-- 3. mark_order_complete RPC (sets stage='Complete' only)
-- 4. Updates get_queue to return cancelled_at field

BEGIN;

-- ============================================================================
-- STEP 1: Add cancelled_at column to both order tables
-- ============================================================================

ALTER TABLE public.orders_bannos
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT NULL;

ALTER TABLE public.orders_flourlane
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.orders_bannos.cancelled_at IS 'Timestamp when order was cancelled. NULL = not cancelled.';
COMMENT ON COLUMN public.orders_flourlane.cancelled_at IS 'Timestamp when order was cancelled. NULL = not cancelled.';

-- ============================================================================
-- STEP 2: Create cancel_order RPC
-- Sets stage='Complete' and cancelled_at=NOW()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id text,
  p_store text,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Update order: set stage to Complete and mark as cancelled
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Complete'', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1',
    v_table_name
  ) USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'cancel_order',
    v_user_id,
    'rpc',
    jsonb_build_object('order_id', p_order_id, 'store', p_store, 'reason', p_reason)
  );

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_order(text, text, text) TO authenticated;
COMMENT ON FUNCTION public.cancel_order IS 'Cancel an order. Sets stage=Complete and cancelled_at=NOW().';

-- ============================================================================
-- STEP 3: Create mark_order_complete RPC
-- Sets stage='Complete' only (does NOT set cancelled_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_order_complete(
  p_order_id text,
  p_store text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
  v_rows_affected integer;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Update order: set stage to Complete (without setting cancelled_at)
  EXECUTE format(
    'UPDATE public.%I SET stage = ''Complete'', packing_complete_ts = COALESCE(packing_complete_ts, NOW()), updated_at = NOW() WHERE id = $1',
    v_table_name
  ) USING p_order_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'mark_order_complete',
    v_user_id,
    'rpc',
    jsonb_build_object('order_id', p_order_id, 'store', p_store)
  );

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_order_complete(text, text) TO authenticated;
COMMENT ON FUNCTION public.mark_order_complete IS 'Mark an order as complete. Sets stage=Complete and packing_complete_ts. Does NOT set cancelled_at.';

-- ============================================================================
-- STEP 4: Update get_queue to return cancelled_at
-- ============================================================================

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
  currency text,
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
  cancelled_at timestamp with time zone,
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
      COALESCE(o.order_json->>'currency', 'AUD')::text as currency,
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
      o.cancelled_at,
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
      -- Exclude POS orders from production queue (they go straight to Complete)
      AND (o.order_json->>'source_name' IS NULL OR LOWER(o.order_json->>'source_name') != 'pos')
    ORDER BY
      -- Priority: Use explicit CASE to get High -> Medium -> Low ordering
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END ASC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END DESC,
      -- Due date sorting (when explicitly requested)
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      -- Stage-specific secondary sorting (based on order's ACTUAL stage)
      -- Filling: Flavour -> Order Number
      CASE WHEN p_sort_by = 'priority' AND o.stage::text = 'Filling' THEN o.flavour END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'priority' AND o.stage::text = 'Filling' THEN o.shopify_order_number END ASC NULLS LAST,
      -- Covering & Decorating: Product Title -> Size
      CASE WHEN p_sort_by = 'priority' AND o.stage::text IN ('Covering', 'Decorating') THEN o.product_title END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'priority' AND o.stage::text IN ('Covering', 'Decorating') THEN o.size END ASC NULLS LAST,
      -- Packing: Size
      CASE WHEN p_sort_by = 'priority' AND o.stage::text = 'Packing' THEN o.size END ASC NULLS LAST,
      -- Final tiebreaker: Order Number
      o.shopify_order_number ASC NULLS LAST
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
      COALESCE(o.order_json->>'currency', 'AUD')::text as currency,
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
      o.cancelled_at,
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
      -- Exclude POS orders from production queue (they go straight to Complete)
      AND (o.order_json->>'source_name' IS NULL OR LOWER(o.order_json->>'source_name') != 'pos')
    ORDER BY
      -- Priority: Use explicit CASE to get High -> Medium -> Low ordering
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END ASC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN
        CASE o.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END
      END DESC,
      -- Due date sorting (when explicitly requested)
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      -- Stage-specific secondary sorting (based on order's ACTUAL stage)
      -- Filling: Flavour -> Order Number
      CASE WHEN p_sort_by = 'priority' AND o.stage::text = 'Filling' THEN o.flavour END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'priority' AND o.stage::text = 'Filling' THEN o.shopify_order_number END ASC NULLS LAST,
      -- Covering & Decorating: Product Title -> Size
      CASE WHEN p_sort_by = 'priority' AND o.stage::text IN ('Covering', 'Decorating') THEN o.product_title END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'priority' AND o.stage::text IN ('Covering', 'Decorating') THEN o.size END ASC NULLS LAST,
      -- Packing: Size
      CASE WHEN p_sort_by = 'priority' AND o.stage::text = 'Packing' THEN o.size END ASC NULLS LAST,
      -- Final tiebreaker: Order Number
      o.shopify_order_number ASC NULLS LAST
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_queue(text, text, uuid, text, text, text, integer, integer, text, text) TO authenticated;

COMMENT ON FUNCTION public.get_queue IS 'Get queue of orders with stage-specific sorting. Returns cancelled_at for status display. Excludes POS orders.';

COMMIT;
