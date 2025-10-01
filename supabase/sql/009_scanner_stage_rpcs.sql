-- 009_scanner_stage_rpcs.sql
-- Phase 5: Scanner & Stage Management RPCs
-- Implements barcode scanning, stage transitions, and complete order lifecycle

-- =============================================
-- BARCODE SCANNING RPCs
-- =============================================

-- Handle print barcode and start filling stage
CREATE OR REPLACE FUNCTION public.handle_print_barcode(
  p_order_id text,
  p_store text
)
RETURNS TABLE (
  success boolean,
  message text,
  order_id text,
  human_id text,
  stage stage_type,
  barcode_data text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name text;
  v_human_id text;
  v_current_stage stage_type;
  v_barcode_data text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to print barcodes
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to print barcodes';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current order details
  EXECUTE format('SELECT human_id, stage FROM public.%I WHERE id = $1', v_table_name)
  USING p_order_id INTO v_human_id, v_current_stage;

  IF v_human_id IS NULL THEN
    RETURN QUERY SELECT false, 'Order not found', p_order_id, NULL::text, NULL::stage_type, NULL::text;
    RETURN;
  END IF;

  -- Check if order is in correct stage for barcode printing
  IF v_current_stage != 'Filling' THEN
    RETURN QUERY SELECT false, 'Order must be in Filling stage to print barcode', p_order_id, v_human_id, v_current_stage, NULL::text;
    RETURN;
  END IF;

  -- Generate barcode data (format: STORE-HUMAN_ID)
  v_barcode_data := upper(p_store) || '-' || v_human_id;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update filling start timestamp
  EXECUTE format('UPDATE public.%I SET filling_start_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage event
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES (
    p_order_id, p_store, 'Filling', 'started', auth.uid(), 'Barcode printed and filling stage started'
  );

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'print_barcode',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN QUERY SELECT true, 'Barcode printed successfully', p_order_id, v_human_id, 'Filling', v_barcode_data;
END;
$$;

-- Get order for scan (lookup by barcode)
CREATE OR REPLACE FUNCTION public.get_order_for_scan(
  p_barcode_data text
)
RETURNS TABLE (
  order_id text,
  human_id text,
  store text,
  stage stage_type,
  customer_name text,
  product_title text,
  assignee_id uuid,
  assignee_name text,
  can_scan boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id text;
  v_human_id text;
  v_store text;
  v_stage stage_type;
  v_customer_name text;
  v_product_title text;
  v_assignee_id uuid;
  v_assignee_name text;
  v_barcode_parts text[];
BEGIN
  -- Check if user has permission to scan
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to scan orders';
  END IF;

  -- Parse barcode data (format: STORE-HUMAN_ID)
  v_barcode_parts := string_to_array(p_barcode_data, '-');
  
  IF array_length(v_barcode_parts, 1) != 2 THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::stage_type, NULL::text, NULL::text, NULL::uuid, NULL::text, false, 'Invalid barcode format';
    RETURN;
  END IF;

  v_store := lower(v_barcode_parts[1]);
  v_human_id := v_barcode_parts[2];

  -- Validate store
  IF v_store NOT IN ('bannos', 'flourlane') THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::stage_type, NULL::text, NULL::text, NULL::uuid, NULL::text, false, 'Invalid store in barcode';
    RETURN;
  END IF;

  -- Look up order
  EXECUTE format('
    SELECT 
      o.id, o.human_id, %L as store, o.stage, o.customer_name, o.product_title, 
      o.assignee_id, s.full_name as assignee_name
    FROM public.orders_%s o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE o.human_id = $1
  ', v_store, v_store)
  USING v_human_id INTO v_order_id, v_human_id, v_store, v_stage, v_customer_name, v_product_title, v_assignee_id, v_assignee_name;

  IF v_order_id IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::stage_type, NULL::text, NULL::text, NULL::uuid, NULL::text, false, 'Order not found';
    RETURN;
  END IF;

  -- Check if order can be scanned (not complete)
  IF v_stage = 'Complete' THEN
    RETURN QUERY SELECT v_order_id, v_human_id, v_store, v_stage, v_customer_name, v_product_title, v_assignee_id, v_assignee_name, false, 'Order already complete';
    RETURN;
  END IF;

  RETURN QUERY SELECT v_order_id, v_human_id, v_store, v_stage, v_customer_name, v_product_title, v_assignee_id, v_assignee_name, true, 'Order ready for scanning';
END;
$$;

-- =============================================
-- STAGE COMPLETION RPCs
-- =============================================

-- Complete filling stage
CREATE OR REPLACE FUNCTION public.complete_filling(
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
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to complete stages
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to complete stages';
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

  -- Check if order is in filling stage
  IF v_current_stage != 'Filling' THEN
    RAISE EXCEPTION 'Order must be in Filling stage to complete filling';
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage and timestamps
  EXECUTE format('
    UPDATE public.%I 
    SET 
      stage = ''Covering'',
      filling_complete_ts = now(),
      covering_start_ts = now(),
      updated_at = now()
    WHERE id = $1
  ', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage events
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES 
    (p_order_id, p_store, 'Filling', 'completed', auth.uid(), p_notes),
    (p_order_id, p_store, 'Covering', 'started', auth.uid(), 'Filling completed, covering started');

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'complete_filling',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Complete covering stage
CREATE OR REPLACE FUNCTION public.complete_covering(
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
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to complete stages
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to complete stages';
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

  -- Check if order is in covering stage
  IF v_current_stage != 'Covering' THEN
    RAISE EXCEPTION 'Order must be in Covering stage to complete covering';
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage and timestamps
  EXECUTE format('
    UPDATE public.%I 
    SET 
      stage = ''Decorating'',
      covering_complete_ts = now(),
      decorating_start_ts = now(),
      updated_at = now()
    WHERE id = $1
  ', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage events
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES 
    (p_order_id, p_store, 'Covering', 'completed', auth.uid(), p_notes),
    (p_order_id, p_store, 'Decorating', 'started', auth.uid(), 'Covering completed, decorating started');

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'complete_covering',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Complete decorating stage
CREATE OR REPLACE FUNCTION public.complete_decorating(
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
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to complete stages
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to complete stages';
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

  -- Check if order is in decorating stage
  IF v_current_stage != 'Decorating' THEN
    RAISE EXCEPTION 'Order must be in Decorating stage to complete decorating';
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage and timestamps
  EXECUTE format('
    UPDATE public.%I 
    SET 
      stage = ''Packing'',
      decorating_complete_ts = now(),
      packing_start_ts = now(),
      updated_at = now()
    WHERE id = $1
  ', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage events
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES 
    (p_order_id, p_store, 'Decorating', 'completed', auth.uid(), p_notes),
    (p_order_id, p_store, 'Packing', 'started', auth.uid(), 'Decorating completed, packing started');

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'complete_decorating',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Start packing stage (separate function for QC workflow)
CREATE OR REPLACE FUNCTION public.start_packing(
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
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to start stages
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to start stages';
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

  -- Check if order is in decorating stage
  IF v_current_stage != 'Decorating' THEN
    RAISE EXCEPTION 'Order must be in Decorating stage to start packing';
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage and timestamps
  EXECUTE format('
    UPDATE public.%I 
    SET 
      stage = ''Packing'',
      packing_start_ts = now(),
      updated_at = now()
    WHERE id = $1
  ', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage event
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES (
    p_order_id, p_store, 'Packing', 'started', auth.uid(), p_notes
  );

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'start_packing',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- Complete packing stage
CREATE OR REPLACE FUNCTION public.complete_packing(
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
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to complete stages
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to complete stages';
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

  -- Check if order is in packing stage
  IF v_current_stage != 'Packing' THEN
    RAISE EXCEPTION 'Order must be in Packing stage to complete packing';
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage and timestamps
  EXECUTE format('
    UPDATE public.%I 
    SET 
      stage = ''Complete'',
      packing_complete_ts = now(),
      updated_at = now()
    WHERE id = $1
  ', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage events
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES (
    p_order_id, p_store, 'Complete', 'completed', auth.uid(), p_notes
  );

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'complete_packing',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- QC return to decorating (quality control workflow)
CREATE OR REPLACE FUNCTION public.qc_return_to_decorating(
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
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Check if user has permission to return orders
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to return orders (Supervisor required)';
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

  -- Check if order is in packing stage
  IF v_current_stage != 'Packing' THEN
    RAISE EXCEPTION 'Order must be in Packing stage to return to decorating';
  END IF;

  -- Get current values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values;

  -- Update stage and timestamps
  EXECUTE format('
    UPDATE public.%I 
    SET 
      stage = ''Decorating'',
      packing_complete_ts = NULL,
      packing_start_ts = NULL,
      decorating_start_ts = now(),
      updated_at = now()
    WHERE id = $1
  ', v_table_name)
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log stage events
  INSERT INTO public.stage_events (
    order_id, store, stage, event, performed_by, notes
  ) VALUES (
    p_order_id, p_store, 'Decorating', 'returned', auth.uid(), 
    COALESCE(p_notes, 'QC return to decorating stage')
  );

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, performed_by
  ) VALUES (
    v_table_name, p_order_id, 'qc_return_to_decorating',
    v_old_values, v_new_values, auth.uid()
  );

  RETURN true;
END;
$$;

-- =============================================
-- COMPATIBILITY WRAPPERS
-- =============================================

-- Print barcode (compatibility wrapper)
CREATE OR REPLACE FUNCTION public.print_barcode(
  p_order_id text,
  p_store text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result FROM public.handle_print_barcode(p_order_id, p_store);
  RETURN v_result.success;
END;
$$;

-- Complete stage (compatibility wrapper)
CREATE OR REPLACE FUNCTION public.complete_stage(
  p_order_id text,
  p_store text,
  p_stage text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE p_stage
    WHEN 'Filling' THEN
      RETURN public.complete_filling(p_order_id, p_store, p_notes);
    WHEN 'Covering' THEN
      RETURN public.complete_covering(p_order_id, p_store, p_notes);
    WHEN 'Decorating' THEN
      RETURN public.complete_decorating(p_order_id, p_store, p_notes);
    WHEN 'Packing' THEN
      RETURN public.complete_packing(p_order_id, p_store, p_notes);
    ELSE
      RAISE EXCEPTION 'Invalid stage: %', p_stage;
  END CASE;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

-- Grant execute permissions on all scanner and stage management functions
GRANT EXECUTE ON FUNCTION public.handle_print_barcode(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_for_scan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_filling(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_covering(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_decorating(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_packing(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_packing(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qc_return_to_decorating(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.print_barcode(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage(text, text, text, text) TO authenticated;
