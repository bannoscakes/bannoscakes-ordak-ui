-- 013_final_rpcs.sql
-- Phase 9: Final RPCs - Analytics, Shopify Integration, and Remaining Functions
-- Implements remaining critical RPC functions

-- =============================================
-- STAFF INFO RPCs
-- =============================================

-- Get current staff member info
CREATE OR REPLACE FUNCTION public.get_staff_me()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  store text,
  is_active boolean,
  phone text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    s.user_id,
    s.full_name,
    s.role,
    s.store,
    s.is_active,
    s.phone,
    s.email
  FROM public.staff_shared s
  WHERE s.user_id = auth.uid();
END;
$$;

-- =============================================
-- INVENTORY STATUS RPCs
-- =============================================

-- Get inventory status for a component
CREATE OR REPLACE FUNCTION public.get_inventory_status(
  p_sku text
)
RETURNS TABLE (
  sku text,
  name text,
  current_stock numeric,
  reserved_stock numeric,
  available_stock numeric,
  min_stock numeric,
  needs_reorder boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock numeric;
  v_min_stock numeric;
BEGIN
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view inventory status';
  END IF;

  SELECT c.current_stock, c.min_stock
  INTO v_current_stock, v_min_stock
  FROM public.components c
  WHERE c.sku = p_sku;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Component not found: %', p_sku;
  END IF;

  RETURN QUERY
  SELECT 
    p_sku,
    c.name,
    c.current_stock,
    0::numeric as reserved_stock,
    c.current_stock as available_stock,
    c.min_stock,
    (c.current_stock < c.min_stock) as needs_reorder
  FROM public.components c
  WHERE c.sku = p_sku;
END;
$$;

-- =============================================
-- CANCEL & BULK OPERATIONS RPCs
-- =============================================

-- Cancel an order
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id text,
  p_store text,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_user_id uuid;
  v_stage_user_id uuid;
BEGIN
  -- Check if user has permission to cancel orders
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to cancel orders (Admin required)';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- For stage_events, only use valid user IDs
  SELECT user_id INTO v_stage_user_id 
  FROM public.staff_shared 
  WHERE user_id = auth.uid() AND is_active = true;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Delete the order (hard delete as per cancel requirement)
  EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_table_name)
  USING p_order_id;

  -- Log stage event
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES (
    p_order_id, p_store, 'Complete', 'cancelled', v_stage_user_id, 
    COALESCE(p_reason, 'Order cancelled by admin')
  );

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, actor_id, store, order_id
  ) VALUES (
    v_table_name, p_order_id, 'cancel_order',
    v_old_values, v_user_id, p_store, p_order_id
  );

  RETURN true;
END;
$$;

-- Bulk assign staff to multiple orders
CREATE OR REPLACE FUNCTION public.bulk_assign(
  p_store text,
  p_order_ids text[],
  p_staff_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id text;
  v_count integer := 0;
BEGIN
  -- Check if user has permission to bulk assign
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to bulk assign (Supervisor required)';
  END IF;

  -- Validate staff member exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_shared 
    WHERE user_id = p_staff_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;

  -- Assign staff to each order
  FOREACH v_order_id IN ARRAY p_order_ids
  LOOP
    PERFORM public.assign_staff(v_order_id, p_store, p_staff_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =============================================
-- SHOPIFY INTEGRATION RPCs (Placeholders)
-- =============================================

-- Test storefront token
CREATE OR REPLACE FUNCTION public.test_storefront_token(
  p_store text
)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to test tokens (Admin required)';
  END IF;

  -- Placeholder: In production, this would verify Shopify API connection
  RETURN QUERY SELECT true, 'Token test not implemented yet - placeholder function';
END;
$$;

-- Connect catalog
CREATE OR REPLACE FUNCTION public.connect_catalog(
  p_store text,
  p_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to connect catalog (Admin required)';
  END IF;

  -- Placeholder: In production, this would sync product catalog from Shopify
  RETURN true;
END;
$$;

-- Sync Shopify orders
CREATE OR REPLACE FUNCTION public.sync_shopify_orders(
  p_store text,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text,
  orders_synced integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to sync orders (Admin required)';
  END IF;

  -- Placeholder: In production, this would sync orders from Shopify with advisory lock
  RETURN QUERY SELECT true, 'Sync not implemented yet - placeholder function', 0;
END;
$$;

-- =============================================
-- TIME & PAYROLL RPCs
-- =============================================

-- Get staff times for payroll
CREATE OR REPLACE FUNCTION public.get_staff_times(
  p_from date,
  p_to date,
  p_store text DEFAULT NULL
)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  total_shifts bigint,
  total_hours numeric,
  total_breaks numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to view staff times';
  END IF;

  RETURN QUERY
  SELECT 
    s.user_id as staff_id,
    s.full_name as staff_name,
    COUNT(sh.id) as total_shifts,
    SUM(EXTRACT(EPOCH FROM (sh.shift_end - sh.shift_start)) / 3600.0)::numeric as total_hours,
    SUM(sh.total_break_minutes)::numeric as total_breaks
  FROM public.staff_shared s
  LEFT JOIN public.staff_shifts sh ON s.user_id = sh.staff_id
  WHERE (p_store IS NULL OR s.store = p_store)
    AND sh.shift_start::date >= p_from
    AND sh.shift_start::date <= p_to
  GROUP BY s.user_id, s.full_name
  ORDER BY s.full_name;
END;
$$;

-- Get detailed time entries for a staff member
CREATE OR REPLACE FUNCTION public.get_staff_times_detail(
  p_staff_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE (
  shift_id uuid,
  shift_start timestamptz,
  shift_end timestamptz,
  total_hours numeric,
  total_breaks integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to view staff times';
  END IF;

  RETURN QUERY
  SELECT 
    sh.id as shift_id,
    sh.shift_start,
    sh.shift_end,
    EXTRACT(EPOCH FROM (sh.shift_end - sh.shift_start)) / 3600.0 as total_hours,
    sh.total_break_minutes as total_breaks
  FROM public.staff_shifts sh
  WHERE sh.staff_id = p_staff_id
    AND sh.shift_start::date >= p_from
    AND sh.shift_start::date <= p_to
  ORDER BY sh.shift_start DESC;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_staff_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_assign(text, text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_storefront_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_catalog(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_shopify_orders(text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_times(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_times_detail(uuid, date, date) TO authenticated;
