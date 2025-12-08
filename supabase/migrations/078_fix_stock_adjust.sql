-- ============================================================================
-- Fix adjust_component_stock to use correct column names for stock_transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_component_stock(
  p_component_id uuid,
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
  v_before integer;
  v_after integer;
  v_component_name text;
  v_transaction_type text;
BEGIN
  -- Atomic UPDATE with RETURNING to avoid race conditions
  -- The WHERE clause ensures non-negative stock (prevents going below 0)
  UPDATE public.components
  SET
    current_stock = current_stock + p_change,
    updated_at = now()
  WHERE
    id = p_component_id
    AND (current_stock + p_change) >= 0  -- Ensure non-negative stock
  RETURNING
    current_stock - p_change,  -- old value (before update)
    current_stock,             -- new value (after update)
    name
  INTO v_before, v_after, v_component_name;

  -- Check if update succeeded
  IF NOT FOUND THEN
    -- Check if component exists
    IF EXISTS (SELECT 1 FROM public.components WHERE id = p_component_id) THEN
      -- Component exists but stock would go negative
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock');
    ELSE
      -- Component doesn't exist
      RETURN jsonb_build_object('success', false, 'error', 'Component not found');
    END IF;
  END IF;

  v_transaction_type := CASE WHEN p_change > 0 THEN 'restock' ELSE 'adjustment' END;

  -- Log the transaction
  INSERT INTO public.stock_transactions (
    table_name, item_id, transaction_type, quantity_change, quantity_before, quantity_after, reason
  ) VALUES (
    'components', p_component_id, v_transaction_type, p_change, v_before, v_after, p_reason
  );

  RETURN jsonb_build_object('success', true, 'component', v_component_name, 'before', v_before, 'after', v_after, 'change', p_change);
END;
$$;
