-- Fix: Qualify column reference in adjust_accessory_stock function
-- The "current_stock" column was ambiguous when used with FROM clause
-- because it exists in both accessories table and old_stock CTE

CREATE OR REPLACE FUNCTION public.adjust_accessory_stock(
  p_accessory_id uuid,
  p_change integer,
  p_reason text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_before integer;
  v_after integer;
  v_accessory_name text;
  v_transaction_type text;
  v_effective_change integer;
BEGIN
  -- Determine transaction type based on change direction
  v_transaction_type := CASE WHEN p_change > 0 THEN 'restock' ELSE 'adjustment' END;

  -- Atomic update with CTE to correctly capture pre-update stock value
  -- (RETURNING only sees post-update values, so we need CTE for stock_before)
  -- FOR UPDATE locks the row to prevent concurrent modifications
  WITH old_stock AS (
    SELECT current_stock, name
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
    accessories.current_stock AS stock_after
  INTO v_accessory_name, v_before, v_after;

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

  RETURN jsonb_build_object(
    'success', true,
    'accessory', v_accessory_name,
    'before', v_before,
    'after', v_after,
    'change', v_effective_change,
    'needs_sync', (v_after = 0)
  );
END;
$$;
