-- Migration: 074_fix_inventory_use_components.sql
-- Purpose: Fix inventory deduction to use components table (which has data)
--          instead of inventory_items table (which is empty)
--
-- Problem: Migration 058 overwrote deduct_inventory_for_order to use inventory_items,
--          but all data lives in components (42 rows). This migration restores
--          component-based logic while keeping the good parts of 058.
--
-- Tables used after this migration:
--   - components (stock levels)
--   - bom_items.component_id (BOM links)
--   - stock_transactions (transaction log)

BEGIN;

-- ============================================================================
-- DROP OLD FUNCTIONS (from 058)
-- ============================================================================

DROP FUNCTION IF EXISTS public.deduct_inventory_for_order(text, text, text, integer);
DROP FUNCTION IF EXISTS public.restock_order(text, text);

-- ============================================================================
-- ENSURE stock_transactions HAS REQUIRED COLUMNS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_transactions' 
    AND column_name = 'transaction_type'
  ) THEN
    ALTER TABLE public.stock_transactions 
    ADD COLUMN transaction_type text NOT NULL DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_transactions' 
    AND column_name = 'quantity_change'
  ) THEN
    ALTER TABLE public.stock_transactions 
    ADD COLUMN quantity_change numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_transactions' 
    AND column_name = 'quantity_before'
  ) THEN
    ALTER TABLE public.stock_transactions 
    ADD COLUMN quantity_before numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_transactions' 
    AND column_name = 'quantity_after'
  ) THEN
    ALTER TABLE public.stock_transactions 
    ADD COLUMN quantity_after numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_transactions' 
    AND column_name = 'reference_order_id'
  ) THEN
    ALTER TABLE public.stock_transactions 
    ADD COLUMN reference_order_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_transactions' 
    AND column_name = 'performed_by'
  ) THEN
    ALTER TABLE public.stock_transactions 
    ADD COLUMN performed_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_transactions' 
    AND column_name = 'store'
  ) THEN
    ALTER TABLE public.stock_transactions 
    ADD COLUMN store text;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_stock_transactions_order_lookup
  ON public.stock_transactions (reference_order_id, transaction_type);

-- ============================================================================
-- HELPER: Safe audit logging (avoids FK violation on public.users)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.safe_audit_log(
  p_action text,
  p_source text,
  p_meta jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Only insert if user exists in public.users OR performed_by is nullable
  -- Check if the FK constraint exists and if user is valid
  IF v_user_id IS NULL THEN
    -- No authenticated user, insert with NULL performed_by
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (p_action, NULL, p_source, p_meta);
  ELSIF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    -- User exists, safe to insert with user ID
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (p_action, v_user_id, p_source, p_meta);
  ELSE
    -- User doesn't exist in public.users, insert with NULL to avoid FK violation
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (p_action, NULL, p_source, p_meta);
  END IF;
EXCEPTION
  WHEN foreign_key_violation THEN
    -- Fallback: insert without performed_by if FK fails
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (p_action, NULL, p_source, p_meta);
END;
$function$;

-- ============================================================================
-- NEW deduct_inventory_for_order FUNCTION
-- Uses: components.current_stock + bom_items.component_id
-- Logs to: stock_transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order(
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
  v_table_name text;
  v_bom record;
  v_quantity_multiplier integer;
  v_product_title text;
  v_existing integer;
  v_item record;
  v_deducted jsonb := '[]'::jsonb;
  v_insufficient jsonb := '[]'::jsonb;
  v_tx_hash bigint;
  v_user_id uuid;
  v_new_stock numeric;
  v_rows integer;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Check feature flag
  SELECT COALESCE((value #>> '{}')::boolean, false)
  INTO v_flag_enabled
  FROM public.settings
  WHERE store = p_store
    AND key = 'inventory_tracking_enabled';

  IF NOT v_flag_enabled THEN
    PERFORM public.safe_audit_log(
      'inventory_deduction_skipped',
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'feature_flag_disabled'
      )
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'feature_flag_disabled');
  END IF;

  v_user_id := auth.uid();

  -- Look up order to get product_title and item_qty if not provided
  v_table_name := format('orders_%s', p_store);
  EXECUTE format('SELECT product_title, item_qty FROM %I WHERE id = $1', v_table_name)
    USING p_order_id
    INTO v_order;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF COALESCE(v_rows, 0) = 0 THEN
    PERFORM public.safe_audit_log(
      'inventory_deduction_skipped',
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'order_not_found'
      )
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'order_not_found');
  END IF;

  -- Use provided values or fall back to order values
  v_product_title := COALESCE(p_product_title, v_order.product_title);
  v_quantity_multiplier := GREATEST(COALESCE(p_quantity, v_order.item_qty, 1), 1);

  -- Find matching BOM
  SELECT b.id, b.product_title
  INTO v_bom
  FROM public.boms b
  WHERE b.is_active = true
    AND b.product_title = v_product_title
    AND (b.store = p_store OR b.store = 'both')
  ORDER BY 
    CASE WHEN b.store = p_store THEN 0 ELSE 1 END,
    b.updated_at DESC
  LIMIT 1;

  IF v_bom.id IS NULL THEN
    PERFORM public.safe_audit_log(
      'inventory_deduction_skipped',
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'product_title', v_product_title,
        'reason', 'bom_not_found'
      )
    );
    RETURN jsonb_build_object(
      'status', 'skipped', 
      'reason', 'bom_not_found',
      'product_title', v_product_title
    );
  END IF;

  -- Advisory lock for idempotency
  v_tx_hash := hashtext(p_store || ':' || p_order_id || ':deduct');
  PERFORM pg_advisory_xact_lock(v_tx_hash);

  -- Check if already deducted FOR THIS STORE
  SELECT COUNT(*)
  INTO v_existing
  FROM public.stock_transactions
  WHERE reference_order_id = p_order_id
    AND transaction_type = 'order_deduction'
    AND store = p_store;

  IF v_existing > 0 THEN
    PERFORM public.safe_audit_log(
      'inventory_deduction_skipped',
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'already_deducted'
      )
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'already_deducted');
  END IF;

  -- First pass: Check stock levels for all required components
  FOR v_item IN
    SELECT 
      bi.id AS bom_item_id,
      bi.component_id,
      bi.quantity_required,
      bi.is_optional,
      c.name AS component_name,
      c.sku AS component_sku,
      c.current_stock
    FROM public.bom_items bi
    JOIN public.components c ON c.id = bi.component_id
    WHERE bi.bom_id = v_bom.id
      AND c.is_active = true
  LOOP
    IF NOT COALESCE(v_item.is_optional, false) 
       AND v_item.current_stock < (v_item.quantity_required * v_quantity_multiplier) THEN
      v_insufficient := v_insufficient || jsonb_build_array(jsonb_build_object(
        'component_id', v_item.component_id,
        'name', v_item.component_name,
        'sku', v_item.component_sku,
        'required', v_item.quantity_required * v_quantity_multiplier,
        'available', v_item.current_stock
      ));
    END IF;
  END LOOP;

  -- If any required components have insufficient stock, abort
  IF jsonb_array_length(v_insufficient) > 0 THEN
    PERFORM public.safe_audit_log(
      'inventory_deduction_failed',
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'insufficient_stock',
        'shortages', v_insufficient
      )
    );
    RETURN jsonb_build_object(
      'status', 'failed',
      'reason', 'insufficient_stock',
      'shortages', v_insufficient
    );
  END IF;

  -- Second pass: Deduct stock for all non-optional components
  FOR v_item IN
    SELECT 
      bi.id AS bom_item_id,
      bi.component_id,
      bi.quantity_required,
      bi.is_optional,
      c.name AS component_name,
      c.sku AS component_sku,
      c.current_stock
    FROM public.bom_items bi
    JOIN public.components c ON c.id = bi.component_id
    WHERE bi.bom_id = v_bom.id
      AND c.is_active = true
      AND COALESCE(bi.is_optional, false) = false
  LOOP
    -- Update component stock
    UPDATE public.components
    SET 
      current_stock = current_stock - (v_item.quantity_required * v_quantity_multiplier),
      updated_at = now()
    WHERE id = v_item.component_id
    RETURNING current_stock INTO v_new_stock;

    -- Log the transaction
    INSERT INTO public.stock_transactions (
      component_id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_order_id,
      reason,
      performed_by,
      store
    ) VALUES (
      v_item.component_id,
      'order_deduction',
      -(v_item.quantity_required * v_quantity_multiplier),
      v_item.current_stock,
      v_new_stock,
      p_order_id,
      'Deducted for order: ' || p_order_id,
      v_user_id,
      p_store
    );

    v_deducted := v_deducted || jsonb_build_array(jsonb_build_object(
      'component_id', v_item.component_id,
      'name', v_item.component_name,
      'sku', v_item.component_sku,
      'quantity', v_item.quantity_required * v_quantity_multiplier,
      'stock_before', v_item.current_stock,
      'stock_after', v_new_stock
    ));
  END LOOP;

  -- Log success
  PERFORM public.safe_audit_log(
    'inventory_deducted',
    'deduct_inventory_for_order',
    jsonb_build_object(
      'store', p_store,
      'order_id', p_order_id,
      'bom_id', v_bom.id,
      'product_title', v_bom.product_title,
      'quantity_multiplier', v_quantity_multiplier,
      'components', v_deducted
    )
  );

  RETURN jsonb_build_object(
    'status', 'deducted',
    'order_id', p_order_id,
    'store', p_store,
    'bom_id', v_bom.id,
    'product_title', v_bom.product_title,
    'components_deducted', jsonb_array_length(v_deducted),
    'components', v_deducted
  );
END;
$function$;

-- ============================================================================
-- NEW restock_order FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restock_order(
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
  v_restocked jsonb := '[]'::jsonb;
  v_new_stock numeric;
  v_tx_hash bigint;
  v_user_id uuid;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Check feature flag
  SELECT COALESCE((value #>> '{}')::boolean, false)
  INTO v_flag_enabled
  FROM public.settings
  WHERE store = p_store
    AND key = 'inventory_tracking_enabled';

  IF NOT v_flag_enabled THEN
    PERFORM public.safe_audit_log(
      'inventory_restock_skipped',
      'restock_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'feature_flag_disabled'
      )
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'feature_flag_disabled');
  END IF;

  v_user_id := auth.uid();

  -- Advisory lock for idempotency
  v_tx_hash := hashtext(p_store || ':' || p_order_id || ':restock');
  PERFORM pg_advisory_xact_lock(v_tx_hash);

  -- Check if already restocked FOR THIS STORE
  SELECT COUNT(*)
  INTO v_existing
  FROM public.stock_transactions
  WHERE reference_order_id = p_order_id
    AND transaction_type = 'order_restock'
    AND store = p_store;

  IF v_existing > 0 THEN
    PERFORM public.safe_audit_log(
      'inventory_restock_skipped',
      'restock_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'already_restocked'
      )
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'already_restocked');
  END IF;

  -- Find all deductions for this order and reverse them (filter by store)
  FOR v_deduction IN
    SELECT 
      st.id AS transaction_id,
      st.component_id,
      ABS(st.quantity_change) AS qty_to_restore,
      c.name AS component_name,
      c.sku AS component_sku,
      c.current_stock
    FROM public.stock_transactions st
    JOIN public.components c ON c.id = st.component_id
    WHERE st.reference_order_id = p_order_id
      AND st.transaction_type = 'order_deduction'
      AND st.store = p_store
  LOOP
    -- Add stock back
    UPDATE public.components
    SET 
      current_stock = current_stock + v_deduction.qty_to_restore,
      updated_at = now()
    WHERE id = v_deduction.component_id
    RETURNING current_stock INTO v_new_stock;

    -- Log the restock transaction
    INSERT INTO public.stock_transactions (
      component_id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_order_id,
      reason,
      performed_by,
      store
    ) VALUES (
      v_deduction.component_id,
      'order_restock',
      v_deduction.qty_to_restore,
      v_deduction.current_stock,
      v_new_stock,
      p_order_id,
      'Restocked from cancelled/returned order: ' || p_order_id,
      v_user_id,
      p_store
    );

    v_restocked := v_restocked || jsonb_build_array(jsonb_build_object(
      'component_id', v_deduction.component_id,
      'name', v_deduction.component_name,
      'sku', v_deduction.component_sku,
      'quantity', v_deduction.qty_to_restore,
      'stock_before', v_deduction.current_stock,
      'stock_after', v_new_stock,
      'source_transaction_id', v_deduction.transaction_id
    ));
  END LOOP;

  IF jsonb_array_length(v_restocked) = 0 THEN
    PERFORM public.safe_audit_log(
      'inventory_restock_skipped',
      'restock_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'no_deductions_found'
      )
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'no_deductions_found');
  END IF;

  -- Log success
  PERFORM public.safe_audit_log(
    'inventory_restocked',
    'restock_order',
    jsonb_build_object(
      'store', p_store,
      'order_id', p_order_id,
      'components', v_restocked
    )
  );

  RETURN jsonb_build_object(
    'status', 'restocked',
    'order_id', p_order_id,
    'store', p_store,
    'components_restocked', jsonb_array_length(v_restocked),
    'components', v_restocked
  );
END;
$function$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.safe_audit_log(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_order(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restock_order(text, text) TO authenticated;

COMMENT ON FUNCTION public.deduct_inventory_for_order(text, text, text, integer) IS 
'Deducts inventory from components table based on BOM requirements. Feature-flagged and idempotent.';

COMMENT ON FUNCTION public.restock_order(text, text) IS 
'Reverses inventory deductions for cancelled/returned orders. Feature-flagged and idempotent.';

COMMIT;