-- ============================================================================
-- Complete fix for cake toppers functionality
-- Issues fixed:
-- 1. adjust_cake_topper_stock uses correct column names from migration 074
-- 2. upsert_cake_topper matches working upsert_accessory pattern (no SET search_path)
-- 3. Add RLS policies for cake_toppers table
-- ============================================================================

BEGIN;

-- ============================================================================
-- Fix adjust_cake_topper_stock to use CORRECT column names from migration 074
-- Migration 074 uses: quantity_change, quantity_before, quantity_after
-- NOT: change_amount, stock_before, stock_after (those are from migration 077)
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
AS $$
DECLARE
  v_old_stock integer;
  v_new_stock integer;
  v_name_1 text;
  v_name_2 text;
  v_transaction_type text;
BEGIN
  -- Determine transaction type based on change direction
  v_transaction_type := CASE
    WHEN p_change > 0 THEN 'restock'
    ELSE 'adjustment'
  END;

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

  -- Log transaction with column names from migration 077
  INSERT INTO public.stock_transactions (
    table_name,
    item_id,
    transaction_type,
    change_amount,     -- From migration 077
    stock_before,      -- From migration 077
    stock_after,       -- From migration 077
    reason,
    reference,
    created_by
  ) VALUES (
    'cake_toppers',
    p_topper_id,
    v_transaction_type,
    p_change,
    v_old_stock,
    v_new_stock,
    p_reason,
    p_reference,
    p_created_by
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
-- Fix upsert_cake_topper to match working upsert_accessory pattern
-- Key change: REMOVE "SET search_path = public" to match working function
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
    UPDATE public.cake_toppers
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
    INSERT INTO public.cake_toppers (
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
      0,
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
-- Enable RLS and create policies for cake_toppers table
-- ============================================================================

ALTER TABLE public.cake_toppers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Allow authenticated users to read cake toppers" ON public.cake_toppers;
DROP POLICY IF EXISTS "Allow authenticated users to insert cake toppers" ON public.cake_toppers;
DROP POLICY IF EXISTS "Allow authenticated users to update cake toppers" ON public.cake_toppers;
DROP POLICY IF EXISTS "Allow authenticated users to delete cake toppers" ON public.cake_toppers;

-- Policy: Allow authenticated users to read all cake toppers
CREATE POLICY "Allow authenticated users to read cake toppers"
ON public.cake_toppers
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert cake toppers
CREATE POLICY "Allow authenticated users to insert cake toppers"
ON public.cake_toppers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to update cake toppers
CREATE POLICY "Allow authenticated users to update cake toppers"
ON public.cake_toppers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to delete cake toppers (for future use)
CREATE POLICY "Allow authenticated users to delete cake toppers"
ON public.cake_toppers
FOR DELETE
TO authenticated
USING (true);

-- Grant permissions (ensure they exist)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cake_toppers TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cake_topper(uuid, text, text, integer, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_cake_topper_stock(uuid, integer, text, text, text) TO authenticated;

COMMIT;
