-- ============================================================================
-- Fix cake topper RPC functions
-- 1. Add transaction_type to adjust_cake_topper_stock
-- 2. Fix any issues with upsert_cake_topper
-- ============================================================================

BEGIN;

-- ============================================================================
-- Fix adjust_cake_topper_stock to include transaction_type
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

  -- Log transaction with transaction_type
  INSERT INTO public.stock_transactions (
    table_name,
    item_id,
    transaction_type,
    change_amount,
    stock_before,
    stock_after,
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

COMMENT ON FUNCTION public.adjust_cake_topper_stock IS 'Adjust cake topper stock atomically. Logs all changes to stock_transactions with transaction_type.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.adjust_cake_topper_stock(uuid, integer, text, text, text) TO authenticated;

COMMIT;
