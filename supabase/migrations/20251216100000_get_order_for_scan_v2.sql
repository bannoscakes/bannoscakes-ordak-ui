-- Migration: get_order_for_scan_v2
-- Purpose: Create RPC function to lookup orders by any barcode format
-- Supports: #B18617, #F18617, bannos-18617, flourlane-18617, plain 18617
-- Works with orders_bannos and orders_flourlane tables

-- Drop existing function if it exists (handles any signature)
DROP FUNCTION IF EXISTS public.get_order_for_scan(text);

-- Create return type for scanner order data
DROP TYPE IF EXISTS scanner_order_result CASCADE;
CREATE TYPE scanner_order_result AS (
  id text,
  shopify_order_number integer,
  customer_name text,
  product_title text,
  size text,
  notes text,
  due_date date,
  delivery_method text,
  stage text,
  priority text,
  storage text,
  store text,
  filling_start_ts timestamptz,
  covering_start_ts timestamptz,
  decorating_start_ts timestamptz,
  filling_complete_ts timestamptz,
  covering_complete_ts timestamptz,
  decorating_complete_ts timestamptz,
  packing_start_ts timestamptz,
  packing_complete_ts timestamptz
);

-- Function: get_order_for_scan
-- Accepts any barcode format and returns normalized order data
CREATE OR REPLACE FUNCTION public.get_order_for_scan(p_scan text)
RETURNS scanner_order_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_temp, public
AS $function$
DECLARE
  v_scan text;
  v_store text;
  v_order_num integer;
  v_order_id text;
  v_result scanner_order_result;
BEGIN
  -- Normalize input: trim and uppercase for prefix detection
  v_scan := upper(trim(p_scan));

  -- Parse barcode format to extract store and order number
  -- Format 1: #B18617 (Bannos barcode)
  IF v_scan LIKE '#B%' THEN
    v_store := 'bannos';
    BEGIN
      v_order_num := substring(v_scan from 3)::integer;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    v_order_id := 'bannos-' || v_order_num;

  -- Format 2: #F18617 (Flourlane barcode)
  ELSIF v_scan LIKE '#F%' THEN
    v_store := 'flourlane';
    BEGIN
      v_order_num := substring(v_scan from 3)::integer;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    v_order_id := 'flourlane-' || v_order_num;

  -- Format 3: bannos-18617 (full order ID)
  ELSIF lower(v_scan) LIKE 'bannos-%' THEN
    v_store := 'bannos';
    BEGIN
      v_order_num := substring(lower(v_scan) from 'bannos-(\d+)')::integer;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    v_order_id := 'bannos-' || v_order_num;

  -- Format 4: flourlane-18617 (full order ID)
  ELSIF lower(v_scan) LIKE 'flourlane-%' THEN
    v_store := 'flourlane';
    BEGIN
      v_order_num := substring(lower(v_scan) from 'flourlane-(\d+)')::integer;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    v_order_id := 'flourlane-' || v_order_num;

  -- Format 5: Plain number 18617 (search both stores)
  ELSIF v_scan ~ '^\d+$' THEN
    BEGIN
      v_order_num := v_scan::integer;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    -- Try bannos first
    v_order_id := 'bannos-' || v_order_num;
    v_store := 'bannos';

  ELSE
    -- Unknown format
    RETURN NULL;
  END IF;

  -- Lookup order from appropriate table
  IF v_store = 'bannos' THEN
    SELECT
      o.id,
      o.shopify_order_number,
      o.customer_name,
      o.product_title,
      o.size,
      o.notes,
      o.due_date,
      o.delivery_method,
      o.stage::text,
      o.priority::text,
      o.storage,
      'bannos'::text,
      o.filling_start_ts,
      o.covering_start_ts,
      o.decorating_start_ts,
      o.filling_complete_ts,
      o.covering_complete_ts,
      o.decorating_complete_ts,
      o.packing_start_ts,
      o.packing_complete_ts
    INTO v_result
    FROM public.orders_bannos o
    WHERE o.id = v_order_id
       OR o.shopify_order_number = v_order_num
    ORDER BY (o.id = v_order_id) DESC
    LIMIT 1;

    -- If not found in bannos and we had a plain number, try flourlane
    IF v_result.id IS NULL AND v_scan ~ '^\d+$' THEN
      v_order_id := 'flourlane-' || v_order_num;
      SELECT
        o.id,
        o.shopify_order_number,
        o.customer_name,
        o.product_title,
        o.size,
        o.notes,
        o.due_date,
        o.delivery_method,
        o.stage::text,
        o.priority::text,
        o.storage,
        'flourlane'::text,
        o.filling_start_ts,
        o.covering_start_ts,
        o.decorating_start_ts,
        o.filling_complete_ts,
        o.covering_complete_ts,
        o.decorating_complete_ts,
        o.packing_start_ts,
        o.packing_complete_ts
      INTO v_result
      FROM public.orders_flourlane o
      WHERE o.id = v_order_id
         OR o.shopify_order_number = v_order_num
      ORDER BY (o.id = v_order_id) DESC
      LIMIT 1;
    END IF;

  ELSIF v_store = 'flourlane' THEN
    SELECT
      o.id,
      o.shopify_order_number,
      o.customer_name,
      o.product_title,
      o.size,
      o.notes,
      o.due_date,
      o.delivery_method,
      o.stage::text,
      o.priority::text,
      o.storage,
      'flourlane'::text,
      o.filling_start_ts,
      o.covering_start_ts,
      o.decorating_start_ts,
      o.filling_complete_ts,
      o.covering_complete_ts,
      o.decorating_complete_ts,
      o.packing_start_ts,
      o.packing_complete_ts
    INTO v_result
    FROM public.orders_flourlane o
    WHERE o.id = v_order_id
       OR o.shopify_order_number = v_order_num
    ORDER BY (o.id = v_order_id) DESC
    LIMIT 1;
  END IF;

  RETURN v_result;
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_order_for_scan(text) IS
'Lookup order by any barcode format. Supports:
- #B18617 (Bannos barcode)
- #F18617 (Flourlane barcode)
- bannos-18617 (full order ID)
- flourlane-18617 (full order ID)
- 18617 (plain number, searches both stores)
Returns scanner_order_result with order details and all stage timestamps.';

-- ============================================================================
-- INDEXES FOR SHOPIFY_ORDER_NUMBER LOOKUPS
-- ============================================================================
-- The WHERE clause in get_order_for_scan uses shopify_order_number which needs
-- an index to avoid full table scans.
--
-- Note: CONCURRENTLY cannot be used inside a transaction block, and Supabase
-- migrations run in transactions. For production with large tables, consider
-- running these indexes manually with CONCURRENTLY outside of migrations.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_bannos_shopify_order_number
  ON public.orders_bannos (shopify_order_number);

CREATE INDEX IF NOT EXISTS idx_orders_flourlane_shopify_order_number
  ON public.orders_flourlane (shopify_order_number);
