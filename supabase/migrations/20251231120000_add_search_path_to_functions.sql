-- Add SET search_path = public to functions missing it
-- This is a security best practice, especially for SECURITY DEFINER functions

-- 1. get_staff_with_shift_status (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.get_staff_with_shift_status()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  email text,
  phone text,
  store text,
  is_active boolean,
  shift_status text,
  shift_store text,
  shift_start timestamptz
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (st.user_id)
      st.user_id,
      st.full_name,
      st.role,
      st.email,
      st.phone,
      st.store,
      st.is_active,
      CASE
        WHEN s.id IS NULL THEN 'Off Shift'
        WHEN b.id IS NOT NULL THEN 'On Break'
        ELSE 'On Shift'
      END as shift_status,
      s.store as shift_store,
      s.start_ts as shift_start
    FROM public.staff_shared st
    LEFT JOIN public.shifts s ON s.staff_id = st.user_id AND s.end_ts IS NULL
    LEFT JOIN public.breaks b ON b.shift_id = s.id AND b.end_ts IS NULL
    WHERE st.is_active = true
    ORDER BY st.user_id
  ) deduplicated
  ORDER BY
    CASE shift_status
      WHEN 'On Shift' THEN 1
      WHEN 'On Break' THEN 2
      ELSE 3
    END,
    full_name;
$$;

-- 2. adjust_accessory_stock (SECURITY DEFINER - critical)
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
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_user_role text;
  v_before integer;
  v_after integer;
  v_accessory_name text;
  v_transaction_type text;
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
      RAISE EXCEPTION 'Invalid UUID format for p_created_by';
    END;
  END IF;

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
