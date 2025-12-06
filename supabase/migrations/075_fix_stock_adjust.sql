-- ============================================================================
-- Fix adjust_component_stock to use correct column names
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
  -- Get current stock
  SELECT current_stock, name INTO v_before, v_component_name
  FROM public.components
  WHERE id = p_component_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Component not found');
  END IF;

  v_after := v_before + p_change;

  -- Determine transaction type based on change direction
  IF p_change > 0 THEN
    v_transaction_type := 'restock';
  ELSE
    v_transaction_type := 'adjustment';
  END IF;

  -- Prevent negative stock
  IF v_after < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock. Current: ' || v_before || ', Requested: ' || (-p_change)
    );
  END IF;

  -- Update stock
  UPDATE public.components
  SET current_stock = v_after, updated_at = now()
  WHERE id = p_component_id;

  -- Log transaction using correct column names from stock_transactions table
  INSERT INTO public.stock_transactions (
    component_id, transaction_type, quantity_change, quantity_before, quantity_after,
    reference_order_id, reason, performed_by
  ) VALUES (
    p_component_id, v_transaction_type, p_change, v_before, v_after,
    p_reference::uuid, p_reason, p_created_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'component', v_component_name,
    'before', v_before,
    'after', v_after,
    'change', p_change
  );
EXCEPTION WHEN invalid_text_representation THEN
  -- If reference can't be cast to uuid, insert without it
  INSERT INTO public.stock_transactions (
    component_id, transaction_type, quantity_change, quantity_before, quantity_after,
    reason, performed_by
  ) VALUES (
    p_component_id, v_transaction_type, p_change, v_before, v_after,
    p_reason, p_created_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'component', v_component_name,
    'before', v_before,
    'after', v_after,
    'change', p_change
  );
END;
$$;
