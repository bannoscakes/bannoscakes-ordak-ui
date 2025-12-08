-- ============================================================================
-- Migration: Fix upsert_bom function signature
-- Issue: Function doesn't have p_shopify_product_id parameter
-- ============================================================================

-- Drop existing function (all overloads)
DROP FUNCTION IF EXISTS public.upsert_bom(uuid, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.upsert_bom(uuid, text, text, text, boolean, text);

-- Recreate with correct signature including shopify_product_id
CREATE OR REPLACE FUNCTION public.upsert_bom(
  p_id uuid DEFAULT NULL,
  p_product_title text DEFAULT NULL,
  p_store text DEFAULT 'both',
  p_description text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_shopify_product_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    -- Try to update existing BOM
    UPDATE public.boms SET
      product_title = COALESCE(p_product_title, product_title),
      store = COALESCE(p_store, store),
      description = p_description,
      shopify_product_id = p_shopify_product_id,
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;

    -- If UPDATE matched no rows (BOM was deleted), raise error
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'BOM with id % not found. It may have been deleted by another user.', p_id
        USING HINT = 'Refresh the page to get the latest data',
              ERRCODE = 'P0002';  -- no_data_found
    END IF;
  ELSE
    -- Insert new BOM
    INSERT INTO public.boms (product_title, store, description, shopify_product_id, is_active)
    VALUES (p_product_title, p_store, p_description, p_shopify_product_id, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_bom(uuid, text, text, text, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.upsert_bom IS 'Create or update a BOM. Does not modify items - use save_bom_items for that.';
