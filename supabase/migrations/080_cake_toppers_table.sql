-- ============================================================================
-- Migration: Cake Toppers Inventory Table
-- Purpose: Track inventory for cake toppers included in cakes (Spiderman, Paw Patrol, etc)
-- Matching: EXACT match on product_title (name_1 OR name_2)
-- PR: Part 1 of 2 - Table + UI only (NO triggers, NO Shopify callback yet)
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: cake_toppers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cake_toppers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_1 text NOT NULL,
  name_2 text DEFAULT NULL,
  current_stock integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock integer NOT NULL DEFAULT 5,
  shopify_product_id_1 text DEFAULT NULL,
  shopify_product_id_2 text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cake_toppers_name_1 ON public.cake_toppers(name_1) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cake_toppers_name_2 ON public.cake_toppers(name_2) WHERE name_2 IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_cake_toppers_stock ON public.cake_toppers(current_stock) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cake_toppers_active ON public.cake_toppers(is_active);

-- Comments
COMMENT ON TABLE public.cake_toppers IS 'Tracks inventory for cake toppers included in cakes. One row = one physical topper that may be used in multiple cake products (name_1, name_2).';
COMMENT ON COLUMN public.cake_toppers.name_1 IS 'Exact product title that uses this topper (e.g., "Spiderman Gelato Cake")';
COMMENT ON COLUMN public.cake_toppers.name_2 IS 'Second product title using same topper (e.g., "Spiderman Sponge Cake"). NULL if only one product uses this topper.';
COMMENT ON COLUMN public.cake_toppers.current_stock IS 'Current stock count. Shared between name_1 and name_2 products.';
COMMENT ON COLUMN public.cake_toppers.min_stock IS 'Minimum stock threshold for alerts.';
COMMENT ON COLUMN public.cake_toppers.shopify_product_id_1 IS 'Shopify product ID for name_1. Used in PR2 to set product out of stock when topper stock = 0.';
COMMENT ON COLUMN public.cake_toppers.shopify_product_id_2 IS 'Shopify product ID for name_2. Used in PR2 to set product out of stock when topper stock = 0.';

-- ============================================================================
-- RPC: get_cake_toppers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_cake_toppers(
  p_active_only boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  name_1 text,
  name_2 text,
  current_stock integer,
  min_stock integer,
  shopify_product_id_1 text,
  shopify_product_id_2 text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.name_1,
    ct.name_2,
    ct.current_stock,
    ct.min_stock,
    ct.shopify_product_id_1,
    ct.shopify_product_id_2,
    ct.is_active,
    ct.created_at,
    ct.updated_at
  FROM cake_toppers ct
  WHERE (NOT p_active_only OR ct.is_active = true)
  ORDER BY ct.name_1 ASC;
END;
$$;

COMMENT ON FUNCTION public.get_cake_toppers IS 'Get all cake toppers, optionally filtered to active only.';

-- ============================================================================
-- RPC: upsert_cake_topper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_cake_topper(
  p_id uuid DEFAULT NULL,
  p_name_1 text DEFAULT NULL,
  p_name_2 text DEFAULT NULL,
  p_min_stock integer DEFAULT 5,
  p_shopify_product_id_1 text DEFAULT NULL,
  p_shopify_product_id_2 text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Validation
  IF p_name_1 IS NULL OR trim(p_name_1) = '' THEN
    RAISE EXCEPTION 'name_1 is required';
  END IF;

  IF p_id IS NOT NULL THEN
    -- UPDATE existing cake topper
    UPDATE cake_toppers
    SET
      name_1 = COALESCE(p_name_1, name_1),
      name_2 = p_name_2,
      min_stock = COALESCE(p_min_stock, min_stock),
      shopify_product_id_1 = p_shopify_product_id_1,
      shopify_product_id_2 = p_shopify_product_id_2,
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Cake topper with id % not found', p_id
        USING HINT = 'Refresh the page to get the latest data',
              ERRCODE = 'P0002';
    END IF;
  ELSE
    -- INSERT new cake topper
    INSERT INTO cake_toppers (
      name_1,
      name_2,
      current_stock,
      min_stock,
      shopify_product_id_1,
      shopify_product_id_2,
      is_active
    )
    VALUES (
      p_name_1,
      p_name_2,
      0,  -- Initial stock is 0, must be adjusted manually
      p_min_stock,
      p_shopify_product_id_1,
      p_shopify_product_id_2,
      p_is_active
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_cake_topper IS 'Create or update a cake topper. Does not modify stock - use adjust_cake_topper_stock for stock changes.';

-- ============================================================================
-- RPC: adjust_cake_topper_stock
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_cake_topper_stock(
  p_topper_id uuid,
  p_change integer,
  p_reason text,
  p_reference text DEFAULT NULL,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_stock integer;
  v_new_stock integer;
  v_name_1 text;
  v_name_2 text;
BEGIN
  -- Atomic stock update
  UPDATE cake_toppers
  SET
    current_stock = current_stock + p_change,
    updated_at = now()
  WHERE id = p_topper_id
  RETURNING
    current_stock - p_change,
    current_stock,
    name_1,
    name_2
  INTO v_old_stock, v_new_stock, v_name_1, v_name_2;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cake topper % not found', p_topper_id;
  END IF;

  -- Log transaction
  INSERT INTO public.stock_transactions (
    component_id,
    qty_delta,
    reason,
    ref
  ) VALUES (
    p_topper_id,
    p_change,
    p_reason,
    p_reference
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_stock', v_old_stock,
    'new_stock', v_new_stock,
    'name_1', v_name_1,
    'name_2', v_name_2
  );
END;
$$;

COMMENT ON FUNCTION public.adjust_cake_topper_stock IS 'Adjust cake topper stock atomically. Logs all changes to stock_transactions.';

-- ============================================================================
-- RPC: get_cake_topper_stock_transactions
-- ============================================================================
-- Note: Using migration 045 schema (component_id, qty_delta, ref)
-- Migration 077 renames these columns, but we use original names for compatibility

CREATE OR REPLACE FUNCTION public.get_cake_topper_stock_transactions(
  p_topper_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  component_id uuid,
  qty_delta numeric,
  reason text,
  ref text,
  created_at timestamptz,
  topper_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.component_id,
    st.qty_delta,
    st.reason,
    st.ref,
    st.created_at,
    ct.name_1 AS topper_name
  FROM public.stock_transactions st
  LEFT JOIN public.cake_toppers ct ON ct.id = st.component_id
  WHERE
    (p_topper_id IS NULL OR st.component_id = p_topper_id)
  ORDER BY st.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_cake_topper_stock_transactions IS 'Get stock transaction history for cake toppers using migration 045 schema.';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON TABLE public.cake_toppers TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cake_toppers(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cake_topper_stock_transactions(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cake_topper(uuid, text, text, integer, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_cake_topper_stock(uuid, integer, text, text, text) TO authenticated;

COMMIT;
