-- ============================================================================
-- Migration: Add Set In Stock Sync
-- Purpose: Queue Shopify inventory sync when stock goes from ≤0 to >0
-- This enables auto-restocking in Shopify (sets inventory to 999)
-- ============================================================================

-- ============================================================================
-- Update CHECK constraint to allow 'set_in_stock' sync action
-- The existing constraint only allows 'set_out_of_stock'
-- ============================================================================

ALTER TABLE public.inventory_sync_queue DROP CONSTRAINT IF EXISTS inventory_sync_queue_sync_action_check;
ALTER TABLE public.inventory_sync_queue ADD CONSTRAINT inventory_sync_queue_sync_action_check CHECK (sync_action IN ('set_out_of_stock', 'set_in_stock'));

-- ============================================================================
-- Update adjust_accessory_stock() to queue set_in_stock when stock ≤0 → >0
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_accessory_stock(
  p_accessory_id uuid,
  p_change integer,
  p_reason text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
  v_user_role text;
  v_before integer;
  v_after integer;
  v_accessory_name text;
  v_transaction_type text;
  v_effective_change integer;
  v_sku text;
BEGIN
  -- Authorization check: verify caller has permission to adjust stock
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the caller's role from staff_shared
  SELECT role INTO v_user_role
  FROM public.staff_shared
  WHERE user_id = v_current_user_id AND is_active = true;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found in staff or inactive';
  END IF;

  -- Only Admin and Supervisor can adjust stock
  IF v_user_role NOT IN ('Admin', 'Supervisor') THEN
    RAISE EXCEPTION 'Unauthorized: only Admin or Supervisor can adjust stock';
  END IF;

  -- If p_created_by is provided, it must match the current user
  IF p_created_by IS NOT NULL THEN
    BEGIN
      IF p_created_by::uuid <> v_current_user_id THEN
        RAISE EXCEPTION 'Unauthorized: p_created_by must match authenticated user';
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid p_created_by format: must be a valid UUID';
    END;
  END IF;

  -- Determine transaction type based on change direction
  v_transaction_type := CASE WHEN p_change > 0 THEN 'restock' ELSE 'adjustment' END;

  -- Atomic update with CTE to correctly capture pre-update stock value
  -- (RETURNING only sees post-update values, so we need CTE for stock_before)
  -- FOR UPDATE locks the row to prevent concurrent modifications
  WITH old_stock AS (
    SELECT current_stock, name, sku
    FROM public.accessories
    WHERE id = p_accessory_id
    FOR UPDATE
  )
  UPDATE public.accessories
  SET
    current_stock = GREATEST(0, accessories.current_stock + p_change),
    updated_at = now()
  FROM old_stock
  WHERE accessories.id = p_accessory_id
  RETURNING
    old_stock.name,
    old_stock.current_stock AS stock_before,
    accessories.current_stock AS stock_after,
    old_stock.sku
  INTO v_accessory_name, v_before, v_after, v_sku;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accessory not found');
  END IF;

  -- Compute effective change (accounts for clamping to 0)
  v_effective_change := v_after - v_before;

  -- Log transaction (FIX: added transaction_type, logs effective change)
  INSERT INTO public.stock_transactions (
    table_name, item_id, transaction_type, change_amount, stock_before, stock_after, reason, reference, created_by
  ) VALUES (
    'accessories', p_accessory_id, v_transaction_type, v_effective_change, v_before, v_after, p_reason, p_reference, p_created_by
  );

  -- Queue Shopify sync if stock just crossed from ≤0 to >0 (restock)
  IF v_before <= 0 AND v_after > 0 AND v_sku IS NOT NULL THEN
    BEGIN
      INSERT INTO public.inventory_sync_queue (
        item_type,
        item_id,
        sync_action,
        shopify_ids
      ) VALUES (
        'accessory',
        p_accessory_id,
        'set_in_stock',
        jsonb_build_object('sku', v_sku)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to queue Shopify sync for accessory restock: %', SQLERRM;
    END;
  END IF;

  -- Return queued_sync only when sync was actually queued
  -- Note: set_out_of_stock is queued by deduct_inventory_on_order trigger, not this RPC
  RETURN jsonb_build_object(
    'success', true,
    'accessory', v_accessory_name,
    'before', v_before,
    'after', v_after,
    'change', v_effective_change,
    'queued_sync', CASE
      WHEN v_before <= 0 AND v_after > 0 AND v_sku IS NOT NULL THEN 'set_in_stock'
      ELSE NULL
    END
  );
END;
$$;

-- ============================================================================
-- Update adjust_cake_topper_stock() to queue set_in_stock when stock ≤0 → >0
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
  v_current_user_id uuid;
  v_user_role text;
  v_old_stock integer;
  v_new_stock integer;
  v_name_1 text;
  v_name_2 text;
  v_transaction_type text;
  v_product_id_1 text;
  v_product_id_2 text;
  v_effective_change integer;
BEGIN
  -- Authorization check: verify caller has permission to adjust stock
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the caller's role from staff_shared
  SELECT role INTO v_user_role
  FROM public.staff_shared
  WHERE user_id = v_current_user_id AND is_active = true;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found in staff or inactive';
  END IF;

  -- Only Admin and Supervisor can adjust stock
  IF v_user_role NOT IN ('Admin', 'Supervisor') THEN
    RAISE EXCEPTION 'Unauthorized: only Admin or Supervisor can adjust stock';
  END IF;

  -- If p_created_by is provided, it must match the current user
  IF p_created_by IS NOT NULL THEN
    BEGIN
      IF p_created_by::uuid <> v_current_user_id THEN
        RAISE EXCEPTION 'Unauthorized: p_created_by must match authenticated user';
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid p_created_by format: must be a valid UUID';
    END;
  END IF;

  -- Determine transaction type based on change direction
  v_transaction_type := CASE
    WHEN p_change > 0 THEN 'restock'
    ELSE 'adjustment'
  END;

  -- Atomic update with CTE to correctly capture pre-update stock value
  -- (RETURNING only sees post-update values, so we need CTE for stock_before)
  -- FOR UPDATE locks the row to prevent concurrent modifications
  WITH old_values AS (
    SELECT current_stock, name_1, name_2, shopify_product_id_1, shopify_product_id_2
    FROM public.cake_toppers
    WHERE id = p_topper_id
    FOR UPDATE
  )
  UPDATE public.cake_toppers
  SET
    current_stock = GREATEST(0, cake_toppers.current_stock + p_change),
    updated_at = now()
  FROM old_values
  WHERE cake_toppers.id = p_topper_id
  RETURNING
    old_values.current_stock AS stock_before,
    cake_toppers.current_stock AS stock_after,
    old_values.name_1,
    old_values.name_2,
    old_values.shopify_product_id_1,
    old_values.shopify_product_id_2
  INTO v_old_stock, v_new_stock, v_name_1, v_name_2, v_product_id_1, v_product_id_2;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cake topper % not found', p_topper_id;
  END IF;

  -- Compute effective change (accounts for clamping to 0)
  v_effective_change := v_new_stock - v_old_stock;

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
    v_effective_change,
    v_old_stock,
    v_new_stock,
    p_reason,
    p_reference,
    p_created_by
  );

  -- Queue Shopify sync if stock just crossed from ≤0 to >0 (restock)
  IF v_old_stock <= 0 AND v_new_stock > 0 THEN
    IF v_product_id_1 IS NOT NULL OR v_product_id_2 IS NOT NULL THEN
      BEGIN
        INSERT INTO public.inventory_sync_queue (
          item_type,
          item_id,
          sync_action,
          shopify_ids
        ) VALUES (
          'cake_topper',
          p_topper_id,
          'set_in_stock',
          jsonb_build_object(
            'product_id_1', v_product_id_1,
            'product_id_2', v_product_id_2
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to queue Shopify sync for cake_topper restock: %', SQLERRM;
      END;
    END IF;
  END IF;

  -- Return queued_sync only when sync was actually queued
  -- Note: set_out_of_stock is queued by deduct_inventory_on_order trigger, not this RPC
  RETURN jsonb_build_object(
    'success', true,
    'old_stock', v_old_stock,
    'new_stock', v_new_stock,
    'change', v_effective_change,
    'name_1', v_name_1,
    'name_2', v_name_2,
    'queued_sync', CASE
      WHEN v_old_stock <= 0 AND v_new_stock > 0 AND (v_product_id_1 IS NOT NULL OR v_product_id_2 IS NOT NULL) THEN 'set_in_stock'
      ELSE NULL
    END
  );
END;
$$;

COMMENT ON FUNCTION public.adjust_accessory_stock IS 'Adjust accessory stock atomically. Clamps at 0. Logs all changes to stock_transactions. Queues Shopify sync for restocks (≤0 → >0).';
COMMENT ON FUNCTION public.adjust_cake_topper_stock IS 'Adjust cake topper stock atomically. Clamps at 0. Logs all changes to stock_transactions. Queues Shopify sync for restocks (≤0 → >0).';
