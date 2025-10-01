-- 007_order_management_rpcs.sql
-- Phase 3: Order Management RPCs
-- Implements order assignment, stage progression, and order updates

-- =============================================
-- ORDER ASSIGNMENT RPCs
-- =============================================

-- Assign staff member to an order
CREATE OR REPLACE FUNCTION public.assign_staff(
  p_order_id text,
  p_store text,
  p_staff_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to assign staff
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to assign staff';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Check if staff member exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_shared 
    WHERE user_id = p_staff_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update order assignment
  EXECUTE format('UPDATE public.%I SET assignee_id = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_staff_id, p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'assign_staff',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Unassign staff member from an order
CREATE OR REPLACE FUNCTION public.unassign_staff(
  p_order_id text,
  p_store text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to unassign staff
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to unassign staff';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update order assignment
  EXECUTE format('UPDATE public.%I SET assignee_id = NULL, updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'unassign_staff',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- =============================================
-- STAGE PROGRESSION RPCs
-- =============================================

-- Move order to next stage
CREATE OR REPLACE FUNCTION public.move_to_next_stage(
  p_order_id text,
  p_store text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_next_stage stage_type;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to move stages
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to move stages';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current stage
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  USING p_order_id INTO v_current_stage;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Determine next stage
  CASE v_current_stage
    WHEN 'Filling' THEN v_next_stage := 'Covering';
    WHEN 'Covering' THEN v_next_stage := 'Decorating';
    WHEN 'Decorating' THEN v_next_stage := 'Packing';
    WHEN 'Packing' THEN v_next_stage := 'Complete';
    ELSE
      RAISE EXCEPTION 'Cannot move from stage: %', v_current_stage;
  END CASE;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage
  EXECUTE format('UPDATE public.%I SET stage = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING v_next_stage, p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage event
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES (
    p_order_id, p_store, v_next_stage, 'started', auth.uid(), p_notes
  );

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'move_to_next_stage',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Move order to specific stage
CREATE OR REPLACE FUNCTION public.move_to_stage(
  p_order_id text,
  p_store text,
  p_stage stage_type,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to move stages
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to move stages';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current stage
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  USING p_order_id INTO v_current_stage;

  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Check if stage is valid
  IF p_stage NOT IN ('Filling', 'Covering', 'Decorating', 'Packing', 'Complete') THEN
    RAISE EXCEPTION 'Invalid stage: %', p_stage;
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage
  EXECUTE format('UPDATE public.%I SET stage = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_stage, p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage event
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES (
    p_order_id, p_store, p_stage, 'started', auth.uid(), p_notes
  );

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'move_to_stage',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- =============================================
-- ORDER UPDATE RPCs
-- =============================================

-- Update order notes
CREATE OR REPLACE FUNCTION public.update_order_notes(
  p_order_id text,
  p_store text,
  p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to update orders
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to update orders';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update notes
  EXECUTE format('UPDATE public.%I SET notes = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_notes, p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'update_notes',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Update order priority
CREATE OR REPLACE FUNCTION public.update_order_priority(
  p_order_id text,
  p_store text,
  p_priority priority_level
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to update orders
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to update orders';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate priority
  IF p_priority NOT IN ('High', 'Medium', 'Low') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update priority
  EXECUTE format('UPDATE public.%I SET priority = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_priority, p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'update_priority',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Update order due date
CREATE OR REPLACE FUNCTION public.update_order_due_date(
  p_order_id text,
  p_store text,
  p_due_date date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to update orders
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to update orders';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update due date
  EXECUTE format('UPDATE public.%I SET due_date = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_due_date, p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'update_due_date',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- =============================================
-- ORDER LOOKUP RPCs
-- =============================================

-- Get single order by ID and store
CREATE OR REPLACE FUNCTION public.get_order(
  p_order_id text,
  p_store text
)
RETURNS TABLE (
  id text,
  human_id text,
  shopify_order_id bigint,
  shopify_order_number integer,
  customer_name text,
  product_title text,
  flavour text,
  notes text,
  currency text,
  total_amount numeric,
  stage stage_type,
  priority priority_level,
  due_date date,
  delivery_method text,
  size text,
  item_qty integer,
  storage text,
  assignee_id uuid,
  assignee_name text,
  store text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
BEGIN
  -- Check if user has permission to view orders
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view orders';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Return order with assignee name
  RETURN QUERY
  EXECUTE format('
    SELECT 
      o.id,
      o.human_id,
      o.shopify_order_id,
      o.shopify_order_number,
      o.customer_name,
      o.product_title,
      o.flavour,
      o.notes,
      o.currency,
      o.total_amount,
      o.stage,
      o.priority,
      o.due_date,
      o.delivery_method,
      o.size,
      o.item_qty,
      o.storage,
      o.assignee_id,
      s.full_name as assignee_name,
      %L as store,
      o.created_at,
      o.updated_at
    FROM public.%I o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE o.id = $1
  ', p_store, v_table_name)
  USING p_order_id;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

-- Grant execute permissions on all order management functions
GRANT EXECUTE ON FUNCTION public.assign_staff(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_staff(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_to_next_stage(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_to_stage(text, text, stage_type, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_notes(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_priority(text, text, priority_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_due_date(text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order(text, text) TO authenticated;
