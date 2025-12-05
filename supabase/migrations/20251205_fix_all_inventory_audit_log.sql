-- Fix ALL inventory functions to safely handle audit logging
-- Issue: audit_log.performed_by has FK to public.users, but public.users table is empty
-- Solution: Check if user exists in public.users before attempting to insert into audit_log
-- Functions fixed: upsert_component, update_component_stock, deduct_inventory_for_order, restock_order

-- ============================================================================
-- Function 1/4: upsert_component
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_component(
  p_sku text, 
  p_name text, 
  p_id uuid DEFAULT NULL::uuid, 
  p_description text DEFAULT NULL::text, 
  p_category text DEFAULT NULL::text, 
  p_unit text DEFAULT 'each'::text, 
  p_current_stock numeric DEFAULT 0, 
  p_min_stock numeric DEFAULT 0, 
  p_max_stock numeric DEFAULT NULL::numeric, 
  p_cost_per_unit numeric DEFAULT NULL::numeric, 
  p_supplier text DEFAULT NULL::text, 
  p_supplier_sku text DEFAULT NULL::text, 
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_component_id uuid;
  v_user_id uuid;
  v_user_exists boolean;
BEGIN
  v_user_id := auth.uid();

  -- Upsert component
  INSERT INTO public.components (
    id, sku, name, description, category, unit, 
    current_stock, min_stock, max_stock, cost_per_unit, 
    supplier, supplier_sku
  ) VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_sku, p_name, p_description, p_category, p_unit,
    p_current_stock, p_min_stock, p_max_stock, p_cost_per_unit,
    p_supplier, p_supplier_sku
  )
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    current_stock = EXCLUDED.current_stock,
    min_stock = EXCLUDED.min_stock,
    max_stock = EXCLUDED.max_stock,
    cost_per_unit = EXCLUDED.cost_per_unit,
    supplier = EXCLUDED.supplier,
    supplier_sku = EXCLUDED.supplier_sku,
    updated_at = now()
  RETURNING id INTO v_component_id;

  -- Only log if user exists in public.users (FK target)
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        CASE WHEN p_id IS NOT NULL THEN 'update_component' ELSE 'create_component' END,
        v_user_id,
        'inventory_system',
        jsonb_build_object(
          'component_id', v_component_id,
          'sku', p_sku,
          'name', p_name,
          'category', p_category
        )
      );
    END IF;
  END IF;

  RETURN v_component_id;
END;
$function$;

-- ============================================================================
-- Function 2/4: update_component_stock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_component_stock(
  p_component_id uuid, 
  p_delta numeric, 
  p_reason text, 
  p_order_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_old_stock numeric;
  v_new_stock numeric;
  v_user_id uuid;
  v_user_exists boolean;
  v_component_name text;
BEGIN
  v_user_id := auth.uid();
  
  -- Get current stock and component name
  SELECT current_stock, name INTO v_old_stock, v_component_name
  FROM public.components 
  WHERE id = p_component_id;
  
  IF v_old_stock IS NULL THEN
    RAISE EXCEPTION 'Component not found: %', p_component_id;
  END IF;
  
  -- Calculate new stock
  v_new_stock := v_old_stock + p_delta;
  
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_old_stock, ABS(p_delta);
  END IF;
  
  -- Update component stock
  UPDATE public.components 
  SET 
    current_stock = v_new_stock,
    updated_at = now()
  WHERE id = p_component_id;
  
  -- Only log if user exists in public.users (FK target)
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'update_stock',
        v_user_id,
        'inventory_system',
        jsonb_build_object(
          'component_id', p_component_id,
          'component_name', v_component_name,
          'old_stock', v_old_stock,
          'new_stock', v_new_stock,
          'delta', p_delta,
          'reason', p_reason,
          'order_id', COALESCE(p_order_id, 'N/A')
        )
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'component_id', p_component_id,
    'old_stock', v_old_stock,
    'new_stock', v_new_stock,
    'delta', p_delta
  );
END;
$function$;

-- ============================================================================
-- Function 3/4: deduct_inventory_for_order
-- ============================================================================
DROP FUNCTION IF EXISTS public.deduct_inventory_for_order(text, text, text, integer);
DROP FUNCTION IF EXISTS public.deduct_inventory_for_order(text, text, integer, text);
DROP FUNCTION IF EXISTS public.deduct_inventory_for_order(text, text);

CREATE FUNCTION public.deduct_inventory_for_order(
  p_order_id text,
  p_store text,
  p_product_title text DEFAULT NULL,
  p_quantity integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_flag_enabled boolean := false;
  v_order record;
  v_bom record;
  v_quantity_multiplier numeric := 1;
  v_table_name text;
  v_existing integer;
  v_updates jsonb := '[]'::jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_optional_skipped jsonb := '[]'::jsonb;
  v_required_shortages jsonb := '[]'::jsonb;
  v_item record;
  v_needed numeric;
  v_after numeric;
  v_update record;
  v_tx_hash bigint;
  v_rows integer;
  v_user_id uuid;
  v_user_exists boolean := false;
BEGIN
  IF p_store NOT IN ('bannos','flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Check user existence once at the start
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
  END IF;

  SELECT COALESCE((value #>> '{}')::boolean, false)
  INTO v_flag_enabled
  FROM public.settings
  WHERE store = p_store
    AND key = 'inventory_tracking_enabled';

  IF NOT v_flag_enabled THEN
    -- Only log if user exists in public.users
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_deduction_skipped',
        v_user_id,
        'deduct_inventory_for_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'feature_flag_disabled'
        )
      );
    END IF;
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'feature_flag_disabled');
  END IF;

  v_table_name := format('orders_%s', p_store);
  EXECUTE format('SELECT product_title, item_qty FROM %I WHERE id = $1', v_table_name)
    USING p_order_id
    INTO v_order;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF COALESCE(v_rows, 0) = 0 THEN
    RAISE EXCEPTION 'Order % not found for store %', p_order_id, p_store;
  END IF;

  v_quantity_multiplier := GREATEST(COALESCE(p_quantity, v_order.item_qty, 1), 1);

  SELECT b.id, b.product_title
  INTO v_bom
  FROM public.boms b
  WHERE b.store = p_store
    AND b.product_title = COALESCE(p_product_title, v_order.product_title)
  ORDER BY b.updated_at DESC, b.created_at DESC
  LIMIT 1;

  IF v_bom.id IS NULL THEN
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_deduction_skipped',
        v_user_id,
        'deduct_inventory_for_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'bom_not_found'
        )
      );
    END IF;
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'bom_not_found');
  END IF;

  v_tx_hash := hashtext(p_store || ':' || p_order_id || ':deduct');
  PERFORM pg_advisory_xact_lock(v_tx_hash);

  SELECT COUNT(*)
  INTO v_existing
  FROM public.inventory_transactions t
  WHERE t.store = p_store
    AND t.order_id = p_order_id
    AND t.direction = 'deduct';

  IF v_existing > 0 THEN
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_deduction_skipped',
        v_user_id,
        'deduct_inventory_for_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'already_deducted'
        )
      );
    END IF;
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'already_deducted');
  END IF;

  FOR v_item IN
    SELECT 
      bi.id AS bom_item_id,
      bi.inventory_item_id,
      COALESCE(bi.is_optional, false) AS is_optional,
      COALESCE(bi.quantity_required, 0) AS quantity_required,
      COALESCE(bi.stage_to_consume, 'Filling') AS stage_to_consume,
      ii.sku,
      ii.name,
      ii.quantity_on_hand
    FROM public.bom_items bi
    LEFT JOIN public.inventory_items ii ON ii.id = bi.inventory_item_id
    WHERE bi.bom_id = v_bom.id
  LOOP
    IF v_item.inventory_item_id IS NULL OR v_item.quantity_on_hand IS NULL THEN
      v_missing := v_missing || jsonb_build_array(jsonb_build_object(
        'bom_item_id', v_item.bom_item_id,
        'optional', v_item.is_optional,
        'reason', 'inventory_item_not_linked'
      ));
      CONTINUE;
    END IF;

    v_needed := v_quantity_multiplier * v_item.quantity_required;

    IF v_needed <= 0 THEN
      CONTINUE;
    END IF;

    IF v_item.quantity_on_hand < v_needed THEN
      IF v_item.is_optional THEN
        v_optional_skipped := v_optional_skipped || jsonb_build_array(jsonb_build_object(
          'inventory_item_id', v_item.inventory_item_id,
          'sku', v_item.sku,
          'name', v_item.name,
          'needed', v_needed,
          'available', v_item.quantity_on_hand
        ));
        CONTINUE;
      ELSE
        v_required_shortages := v_required_shortages || jsonb_build_array(jsonb_build_object(
          'inventory_item_id', v_item.inventory_item_id,
          'sku', v_item.sku,
          'name', v_item.name,
          'needed', v_needed,
          'available', v_item.quantity_on_hand
        ));
        CONTINUE;
      END IF;
    END IF;

    v_updates := v_updates || jsonb_build_array(jsonb_build_object(
      'inventory_item_id', v_item.inventory_item_id::text,
      'bom_item_id', v_item.bom_item_id::text,
      'quantity_before', v_item.quantity_on_hand,
      'quantity_needed', v_needed,
      'stage', v_item.stage_to_consume,
      'sku', v_item.sku,
      'name', v_item.name,
      'optional', v_item.is_optional
    ));
  END LOOP;

  IF jsonb_array_length(v_updates) = 0 THEN
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_deduction_skipped',
        v_user_id,
        'deduct_inventory_for_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'no_components_ready',
          'missing', v_missing,
          'optional_skipped', v_optional_skipped
        )
      );
    END IF;
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'no_components_ready',
      'missing', v_missing,
      'optional_skipped', v_optional_skipped
    );
  END IF;

  IF jsonb_array_length(v_required_shortages) > 0 THEN
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_deduction_skipped',
        v_user_id,
        'deduct_inventory_for_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'insufficient_stock',
          'missing', v_missing,
          'shortages', v_required_shortages,
          'optional_skipped', v_optional_skipped
        )
      );
    END IF;
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'insufficient_stock',
      'missing', v_missing,
      'shortages', v_required_shortages,
      'optional_skipped', v_optional_skipped
    );
  END IF;

  FOR v_update IN
    SELECT
      (elem->>'inventory_item_id')::uuid AS inventory_item_id,
      (elem->>'bom_item_id')::uuid AS bom_item_id,
      (elem->>'quantity_before')::numeric AS quantity_before,
      (elem->>'quantity_needed')::numeric AS quantity_needed,
      elem->>'stage' AS stage,
      elem->>'sku' AS sku,
      elem->>'name' AS name,
      COALESCE((elem->>'optional')::boolean, false) AS optional
    FROM jsonb_array_elements(v_updates) elem
  LOOP
    UPDATE public.inventory_items
    SET quantity_on_hand = quantity_on_hand - v_update.quantity_needed,
        updated_at = now()
    WHERE id = v_update.inventory_item_id
    RETURNING quantity_on_hand INTO v_after;

    INSERT INTO public.inventory_transactions (
      store,
      order_id,
      bom_id,
      bom_item_id,
      inventory_item_id,
      direction,
      quantity,
      quantity_before,
      quantity_after,
      reason,
      metadata
    ) VALUES (
      p_store,
      p_order_id,
      v_bom.id,
      v_update.bom_item_id,
      v_update.inventory_item_id,
      'deduct',
      v_update.quantity_needed,
      v_update.quantity_before,
      v_after,
      'order_deduction',
      jsonb_build_object(
        'stage', v_update.stage,
        'sku', v_update.sku,
        'name', v_update.name,
        'optional', v_update.optional
      )
    )
    ON CONFLICT (store, order_id, inventory_item_id, direction) DO NOTHING;
  END LOOP;

  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_deducted',
      v_user_id,
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'bom_id', v_bom.id,
        'components', v_updates,
        'optional_skipped', v_optional_skipped
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'deducted',
    'order_id', p_order_id,
    'store', p_store,
    'components', v_updates,
    'optional_skipped', v_optional_skipped
  );
END;
$function$;

-- ============================================================================
-- Function 4/4: restock_order
-- ============================================================================
DROP FUNCTION IF EXISTS public.restock_order(text, text);

CREATE FUNCTION public.restock_order(
  p_order_id text,
  p_store text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_flag_enabled boolean := false;
  v_existing integer;
  v_deduction record;
  v_restocks jsonb := '[]'::jsonb;
  v_after numeric;
  v_tx_hash bigint;
  v_rows integer;
  v_user_id uuid;
  v_user_exists boolean := false;
BEGIN
  IF p_store NOT IN ('bannos','flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Check user existence once at the start
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
  END IF;

  SELECT COALESCE((value #>> '{}')::boolean, false)
  INTO v_flag_enabled
  FROM public.settings
  WHERE store = p_store
    AND key = 'inventory_tracking_enabled';

  IF NOT v_flag_enabled THEN
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_restock_skipped',
        v_user_id,
        'restock_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'feature_flag_disabled'
        )
      );
    END IF;
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'feature_flag_disabled');
  END IF;

  v_tx_hash := hashtext(p_store || ':' || p_order_id || ':restock');
  PERFORM pg_advisory_xact_lock(v_tx_hash);

  SELECT COUNT(*)
  INTO v_existing
  FROM public.inventory_transactions t
  WHERE t.store = p_store
    AND t.order_id = p_order_id
    AND t.direction = 'restock';

  IF v_existing > 0 THEN
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_restock_skipped',
        v_user_id,
        'restock_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'already_restocked'
        )
      );
    END IF;
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'already_restocked');
  END IF;

  FOR v_deduction IN
    SELECT 
      t.id,
      t.inventory_item_id,
      t.bom_id,
      t.bom_item_id,
      t.quantity,
      t.quantity_before,
      t.quantity_after,
      t.metadata
    FROM public.inventory_transactions t
    WHERE t.store = p_store
      AND t.order_id = p_order_id
      AND t.direction = 'deduct'
  LOOP
    UPDATE public.inventory_items
    SET quantity_on_hand = quantity_on_hand + v_deduction.quantity,
        updated_at = now()
    WHERE id = v_deduction.inventory_item_id
    RETURNING quantity_on_hand INTO v_after;

    INSERT INTO public.inventory_transactions (
      store,
      order_id,
      bom_id,
      bom_item_id,
      inventory_item_id,
      direction,
      quantity,
      quantity_before,
      quantity_after,
      reason,
      metadata
    ) VALUES (
      p_store,
      p_order_id,
      v_deduction.bom_id,
      v_deduction.bom_item_id,
      v_deduction.inventory_item_id,
      'restock',
      v_deduction.quantity,
      v_deduction.quantity_after,
      v_after,
      'order_restock',
      jsonb_build_object(
        'source_transaction_id', v_deduction.id,
        'original_metadata', v_deduction.metadata
      )
    )
    ON CONFLICT (store, order_id, inventory_item_id, direction) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF COALESCE(v_rows, 0) > 0 THEN
      v_restocks := v_restocks || jsonb_build_array(jsonb_build_object(
        'inventory_item_id', v_deduction.inventory_item_id::text,
        'quantity', v_deduction.quantity,
        'quantity_after', v_after,
        'source_transaction_id', v_deduction.id::text
      ));
    END IF;
  END LOOP;

  IF jsonb_array_length(v_restocks) = 0 THEN
    IF v_user_exists THEN
      INSERT INTO public.audit_log (action, performed_by, source, meta)
      VALUES (
        'inventory_restock_skipped',
        v_user_id,
        'restock_order',
        jsonb_build_object(
          'store', p_store,
          'order_id', p_order_id,
          'reason', 'no_deductions_found'
        )
      );
    END IF;
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'no_deductions_found');
  END IF;

  IF v_user_exists THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_restocked',
      v_user_id,
      'restock_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'components', v_restocks
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'restocked',
    'order_id', p_order_id,
    'store', p_store,
    'components', v_restocks
  );
END;
$function$;

-- ============================================================================
-- Re-grant execute permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.upsert_component(text, text, uuid, text, text, text, numeric, numeric, numeric, numeric, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_component_stock(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_order(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restock_order(text, text) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.upsert_component IS 'Create or update a component. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.update_component_stock IS 'Adjust component stock by delta. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.deduct_inventory_for_order IS 'Feature-flagged inventory deduction. Safely skips audit_log if user not in public.users.';
COMMENT ON FUNCTION public.restock_order IS 'Feature-flagged restock for cancelled orders. Safely skips audit_log if user not in public.users.';

