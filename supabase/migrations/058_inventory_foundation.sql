-- Migration: Task 9 - Inventory deduction foundation
-- Purpose: Establish inventory tables, feature flag, and safe deduction/restock RPCs

BEGIN;

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL CHECK (store IN ('bannos','flourlane','global')),
  sku text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'each',
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  reorder_point numeric NOT NULL DEFAULT 0,
  reorder_quantity numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store, sku)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_store_sku
  ON public.inventory_items (store, sku);

ALTER TABLE public.bom_items
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid,
  ADD COLUMN IF NOT EXISTS store text,
  ADD COLUMN IF NOT EXISTS stage_to_consume text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.bom_items bi
SET store = b.store
FROM public.boms b
WHERE bi.bom_id = b.id
  AND bi.store IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bom_items_inventory_item_id_fkey'
      AND conrelid = 'public.bom_items'::regclass
  ) THEN
    ALTER TABLE public.bom_items
      ADD CONSTRAINT bom_items_inventory_item_id_fkey
      FOREIGN KEY (inventory_item_id)
      REFERENCES public.inventory_items(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bom_items_bom_id_inventory_item_id_key'
      AND conrelid = 'public.bom_items'::regclass
  ) THEN
    ALTER TABLE public.bom_items
      ADD CONSTRAINT bom_items_bom_id_inventory_item_id_key
      UNIQUE (bom_id, inventory_item_id);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL CHECK (store IN ('bannos','flourlane','global')),
  order_id text NOT NULL,
  bom_id uuid,
  bom_item_id uuid,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  direction text NOT NULL CHECK (direction IN ('deduct','restock')),
  quantity numeric NOT NULL,
  quantity_before numeric,
  quantity_after numeric,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_transactions_unique
  ON public.inventory_transactions (store, order_id, inventory_item_id, direction);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order
  ON public.inventory_transactions (store, order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item
  ON public.inventory_transactions (inventory_item_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_transactions_bom_item_id_fkey'
      AND conrelid = 'public.inventory_transactions'::regclass
  ) THEN
    ALTER TABLE public.inventory_transactions
      ADD CONSTRAINT inventory_transactions_bom_item_id_fkey
      FOREIGN KEY (bom_item_id)
      REFERENCES public.bom_items(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'inventory_items_select_policy'
      AND schemaname = 'public'
      AND tablename = 'inventory_items'
  ) THEN
    CREATE POLICY inventory_items_select_policy
      ON public.inventory_items
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'inventory_items_block_writes'
      AND schemaname = 'public'
      AND tablename = 'inventory_items'
  ) THEN
    CREATE POLICY inventory_items_block_writes
      ON public.inventory_items
      FOR ALL
      TO authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'inventory_transactions_select_policy'
      AND schemaname = 'public'
      AND tablename = 'inventory_transactions'
  ) THEN
    CREATE POLICY inventory_transactions_select_policy
      ON public.inventory_transactions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'inventory_transactions_block_writes'
      AND schemaname = 'public'
      AND tablename = 'inventory_transactions'
  ) THEN
    CREATE POLICY inventory_transactions_block_writes
      ON public.inventory_transactions
      FOR ALL
      TO authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END;
$$;

-- ============================================================================
-- FEATURE FLAG SEED
-- ============================================================================

INSERT INTO public.settings (store, key, value)
VALUES 
  ('bannos', 'inventory_tracking_enabled', 'false'::jsonb),
  ('flourlane', 'inventory_tracking_enabled', 'false'::jsonb),
  ('global', 'inventory_tracking_enabled', 'false'::jsonb)
ON CONFLICT (store, key) DO NOTHING;

-- ============================================================================
-- RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order(
  p_order_id text,
  p_product_title text DEFAULT NULL,
  p_store text,
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
BEGIN
  IF p_store NOT IN ('bannos','flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  SELECT COALESCE((value #>> '{}')::boolean, false)
  INTO v_flag_enabled
  FROM public.settings
  WHERE store = p_store
    AND key = 'inventory_tracking_enabled';

  IF NOT v_flag_enabled THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_deduction_skipped',
      auth.uid(),
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'feature_flag_disabled'
      )
    );
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
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_deduction_skipped',
      auth.uid(),
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'bom_not_found'
      )
    );
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
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_deduction_skipped',
      auth.uid(),
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'already_deducted'
      )
    );
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
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_deduction_skipped',
      auth.uid(),
      'deduct_inventory_for_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'no_components_ready',
        'missing', v_missing,
        'optional_skipped', v_optional_skipped
      )
    );
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'no_components_ready',
      'missing', v_missing,
      'optional_skipped', v_optional_skipped
    );
  END IF;

  IF jsonb_array_length(v_required_shortages) > 0 THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_deduction_skipped',
      auth.uid(),
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

  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'inventory_deducted',
    auth.uid(),
    'deduct_inventory_for_order',
    jsonb_build_object(
      'store', p_store,
      'order_id', p_order_id,
      'bom_id', v_bom.id,
      'components', v_updates,
      'optional_skipped', v_optional_skipped
    )
  );

  RETURN jsonb_build_object(
    'status', 'deducted',
    'order_id', p_order_id,
    'store', p_store,
    'components', v_updates,
    'optional_skipped', v_optional_skipped
  );
END;
$function$;

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
  v_restocks jsonb := '[]'::jsonb;
  v_after numeric;
  v_tx_hash bigint;
BEGIN
  IF p_store NOT IN ('bannos','flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  SELECT COALESCE((value #>> '{}')::boolean, false)
  INTO v_flag_enabled
  FROM public.settings
  WHERE store = p_store
    AND key = 'inventory_tracking_enabled';

  IF NOT v_flag_enabled THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_restock_skipped',
      auth.uid(),
      'restock_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'feature_flag_disabled'
      )
    );
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
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_restock_skipped',
      auth.uid(),
      'restock_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'already_restocked'
      )
    );
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

    v_restocks := v_restocks || jsonb_build_array(jsonb_build_object(
      'inventory_item_id', v_deduction.inventory_item_id::text,
      'quantity', v_deduction.quantity,
      'quantity_after', v_after,
      'source_transaction_id', v_deduction.id::text
    ));
  END LOOP;

  IF jsonb_array_length(v_restocks) = 0 THEN
    INSERT INTO public.audit_log (action, performed_by, source, meta)
    VALUES (
      'inventory_restock_skipped',
      auth.uid(),
      'restock_order',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'reason', 'no_deductions_found'
      )
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'no_deductions_found');
  END IF;

  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'inventory_restocked',
    auth.uid(),
    'restock_order',
    jsonb_build_object(
      'store', p_store,
      'order_id', p_order_id,
      'components', v_restocks
    )
  );

  RETURN jsonb_build_object(
    'status', 'restocked',
    'order_id', p_order_id,
    'store', p_store,
    'components', v_restocks
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_order(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restock_order(text, text) TO authenticated;

COMMENT ON FUNCTION public.deduct_inventory_for_order(text, text, text, integer)
  IS 'Feature-flagged inventory deduction for an order. Ensures idempotency, logs audit trail, and rolls back safely.';

COMMENT ON FUNCTION public.restock_order(text, text)
  IS 'Feature-flagged restock helper for cancelled/edited orders. Reverses prior deductions and logs audit trail.';

COMMIT;

