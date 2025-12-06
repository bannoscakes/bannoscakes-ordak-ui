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
  SELECT current_stock, name INTO v_before, v_component_name
  FROM public.components WHERE id = p_component_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Component not found');
  END IF;

  v_after := v_before + p_change;
  v_transaction_type := CASE WHEN p_change > 0 THEN 'restock' ELSE 'adjustment' END;

  IF v_after < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock');
  END IF;

  UPDATE public.components SET current_stock = v_after, updated_at = now() WHERE id = p_component_id;

  INSERT INTO public.stock_transactions (
    table_name, item_id, transaction_type, quantity_change, quantity_before, quantity_after, reason
  ) VALUES (
    'components', p_component_id, v_transaction_type, p_change, v_before, v_after, p_reason
  );

  RETURN jsonb_build_object('success', true, 'component', v_component_name, 'before', v_before, 'after', v_after, 'change', p_change);
END;
$$;
