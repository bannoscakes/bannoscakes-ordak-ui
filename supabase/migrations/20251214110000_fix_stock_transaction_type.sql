-- ============================================================================
-- Migration: Fix stock_transactions INSERT - add missing transaction_type
--
-- PROBLEM:
-- The stock_transactions table has transaction_type as NOT NULL (from migration 074).
-- However, several functions created in migrations 077 and 083 don't include
-- transaction_type in their INSERT statements, causing silent failures.
--
-- FUNCTIONS FIXED:
-- 1. deduct_inventory_on_order - trigger for auto-deduction on order insert
-- 2. adjust_accessory_stock - manual stock adjustment from UI
-- 3. deduct_for_order - BOM-based deduction on order complete
--
-- All INSERTs now include transaction_type column.
-- All functions now have SET search_path = pg_temp, public for security.
-- ============================================================================

-- ============================================================================
-- FIX 1: deduct_inventory_on_order (trigger function)
-- Adds transaction_type = 'order_deduction' for both accessories and cake_toppers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
DECLARE
  v_accessory jsonb;
  v_accessory_title text;
  v_variant_title text;
  v_variant_value text;
  v_combined_title text;
  v_accessory_qty integer;
  v_matched_accessory record;
  v_matched_topper record;
  v_new_stock integer;
  v_product_title text;
BEGIN
  -- ========================================
  -- PART 1: Deduct accessories stock
  -- ========================================
  -- accessories column is JSONB array from Shopify line_items:
  -- Online: [{"title": "Pink Glitter Number Candles", "variant_title": "Pink Glitter / 6", "quantity": 1}, ...]
  -- POS:    [{"title": "Tall Candles", "variant_title": "Blue + Metallic", "quantity": 1}, ...]

  -- Guard: only process if accessories is a non-empty array
  IF NEW.accessories IS NOT NULL
     AND jsonb_typeof(NEW.accessories) = 'array'
     AND jsonb_array_length(NEW.accessories) > 0 THEN
    FOR v_accessory IN SELECT * FROM jsonb_array_elements(NEW.accessories)
    LOOP
      -- Normalize title: trim and convert empty/whitespace to NULL
      v_accessory_title := NULLIF(trim(COALESCE(v_accessory->>'title', '')), '');
      v_variant_title := NULLIF(trim(COALESCE(v_accessory->>'variant_title', '')), '');

      -- Safe quantity extraction: only cast if value is numeric, clamp to minimum 1
      v_accessory_qty := CASE
        WHEN (v_accessory->>'quantity') ~ '^\d+$' THEN GREATEST(1, (v_accessory->>'quantity')::integer)
        ELSE 1
      END;

      -- Build combined title for matching
      -- Handle BOTH separators:
      -- - Online orders use "/" (e.g., "Pink Glitter / 6")
      -- - POS orders use "+" (e.g., "Blue + Metallic")
      IF v_variant_title IS NOT NULL THEN
        -- Check if variant_title contains "/" (online format)
        IF position('/' IN v_variant_title) > 0 THEN
          -- Extract part after "/" and trim whitespace
          v_variant_value := NULLIF(trim(split_part(v_variant_title, '/', 2)), '');
        -- Check if variant_title contains "+" (POS format)
        ELSIF position('+' IN v_variant_title) > 0 THEN
          -- Extract part after "+" and trim whitespace
          v_variant_value := NULLIF(trim(split_part(v_variant_title, '+', 2)), '');
        ELSE
          -- No separator - use entire variant_title
          v_variant_value := v_variant_title;
        END IF;

        -- Combine: "Pink Glitter Number Candles" + " " + "6" = "Pink Glitter Number Candles 6"
        -- Or for POS: "Tall Candles" + " " + "Metallic" = "Tall Candles Metallic"
        -- Handle NULL title gracefully
        IF v_accessory_title IS NOT NULL AND v_variant_value IS NOT NULL THEN
          v_combined_title := v_accessory_title || ' ' || v_variant_value;
        ELSIF v_accessory_title IS NOT NULL THEN
          v_combined_title := v_accessory_title;
        ELSIF v_variant_value IS NOT NULL THEN
          v_combined_title := v_variant_value;
        ELSE
          v_combined_title := NULL;
        END IF;
      ELSE
        -- No variant_title - use title only
        v_combined_title := v_accessory_title;
      END IF;

      -- Skip this accessory if we have no usable title for matching
      IF v_combined_title IS NULL OR v_combined_title = '' THEN
        CONTINUE;
      END IF;

      -- Find matching accessory by keyword (ILIKE match)
      -- Try combined title first, then fall back to title only
      -- Escape special LIKE characters in product_match to ensure literal matching
      -- Use FOR UPDATE to lock the row and prevent race conditions
      SELECT id, name, current_stock, shopify_variant_id
      INTO v_matched_accessory
      FROM public.accessories
      WHERE is_active = true
        AND (
          -- Match combined title (with variant)
          v_combined_title ILIKE '%' ||
              replace(replace(replace(product_match, '\', '\\'), '%', '\%'), '_', '\_')
              || '%' ESCAPE '\'
          OR
          -- Fallback: match title only (for backwards compatibility)
          v_accessory_title ILIKE '%' ||
              replace(replace(replace(product_match, '\', '\\'), '%', '\%'), '_', '\_')
              || '%' ESCAPE '\'
        )
      ORDER BY id
      LIMIT 1
      FOR UPDATE;

      IF v_matched_accessory.id IS NOT NULL THEN
        -- Deduct stock (allow negative for tracking purposes, trigger won't fail)
        UPDATE public.accessories
        SET
          current_stock = current_stock - v_accessory_qty,
          updated_at = now()
        WHERE id = v_matched_accessory.id
        RETURNING current_stock INTO v_new_stock;

        -- Log the transaction (FIX: added transaction_type)
        BEGIN
          INSERT INTO public.stock_transactions (
            table_name,
            item_id,
            transaction_type,
            change_amount,
            stock_before,
            stock_after,
            reason,
            reference,
            created_by
          ) VALUES (
            'accessories',
            v_matched_accessory.id,
            'order_deduction',
            -v_accessory_qty,
            v_matched_accessory.current_stock,
            v_new_stock,
            'order_deduction',
            NEW.id,
            'trigger:deduct_inventory_on_order'
          );
        EXCEPTION WHEN OTHERS THEN
          -- Don't fail the order insert if logging fails
          RAISE WARNING 'Failed to log accessory stock transaction: %', SQLERRM;
        END;

        -- Queue Shopify sync ONLY if stock just crossed from positive to zero/negative
        -- (not if it was already at or below 0 before this deduction)
        IF v_matched_accessory.current_stock > 0 AND v_new_stock <= 0 AND v_matched_accessory.shopify_variant_id IS NOT NULL THEN
          BEGIN
            INSERT INTO public.inventory_sync_queue (
              item_type,
              item_id,
              sync_action,
              shopify_ids
            ) VALUES (
              'accessory',
              v_matched_accessory.id,
              'set_out_of_stock',
              jsonb_build_object('variant_id', v_matched_accessory.shopify_variant_id)
            );
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to queue Shopify sync for accessory: %', SQLERRM;
          END;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ========================================
  -- PART 2: Deduct cake_toppers stock
  -- ========================================
  -- Match by EXACT product_title (name_1 OR name_2)

  -- Trim product_title once and use trimmed value for matching
  v_product_title := NULLIF(trim(COALESCE(NEW.product_title, '')), '');

  IF v_product_title IS NOT NULL THEN
    -- Use FOR UPDATE to lock the row and prevent race conditions
    -- ORDER BY id for deterministic selection
    SELECT id, name_1, name_2, current_stock, shopify_product_id_1, shopify_product_id_2
    INTO v_matched_topper
    FROM public.cake_toppers
    WHERE is_active = true
      AND (
        name_1 = v_product_title
        OR name_2 = v_product_title
      )
    ORDER BY id
    LIMIT 1
    FOR UPDATE;

    IF v_matched_topper.id IS NOT NULL THEN
      -- Deduct stock by 1 (one topper per cake)
      UPDATE public.cake_toppers
      SET
        current_stock = current_stock - 1,
        updated_at = now()
      WHERE id = v_matched_topper.id
      RETURNING current_stock INTO v_new_stock;

      -- Log the transaction (FIX: added transaction_type)
      BEGIN
        INSERT INTO public.stock_transactions (
          table_name,
          item_id,
          transaction_type,
          change_amount,
          stock_before,
          stock_after,
          reason,
          reference,
          created_by
        ) VALUES (
          'cake_toppers',
          v_matched_topper.id,
          'order_deduction',
          -1,
          v_matched_topper.current_stock,
          v_new_stock,
          'order_deduction',
          NEW.id,
          'trigger:deduct_inventory_on_order'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to log cake_topper stock transaction: %', SQLERRM;
      END;

      -- Queue Shopify sync ONLY if stock just crossed from positive to zero/negative
      -- (not if it was already at or below 0 before this deduction)
      IF v_matched_topper.current_stock > 0 AND v_new_stock <= 0 THEN
        IF v_matched_topper.shopify_product_id_1 IS NOT NULL
           OR v_matched_topper.shopify_product_id_2 IS NOT NULL THEN
          BEGIN
            INSERT INTO public.inventory_sync_queue (
              item_type,
              item_id,
              sync_action,
              shopify_ids
            ) VALUES (
              'cake_topper',
              v_matched_topper.id,
              'set_out_of_stock',
              jsonb_build_object(
                'product_id_1', v_matched_topper.shopify_product_id_1,
                'product_id_2', v_matched_topper.shopify_product_id_2
              )
            );
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to queue Shopify sync for cake_topper: %', SQLERRM;
          END;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Always return NEW to allow the order insert to proceed
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the order insert
  RAISE WARNING 'Inventory deduction failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.deduct_inventory_on_order() IS
'Deducts inventory when orders are inserted. Handles both online (/) and POS (+) separator formats for accessory variants. Fixed: now includes transaction_type in stock_transactions INSERT.';


-- ============================================================================
-- FIX 2: adjust_accessory_stock
-- Adds transaction_type based on change direction (restock/adjustment)
-- Adds SET search_path for security
-- Uses atomic UPDATE with RETURNING to prevent lost-update race condition
-- Logs effective change amount (matches stock_after - stock_before)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_accessory_stock(
  p_accessory_id uuid,
  p_change integer,
  p_reason text,
  p_reference text DEFAULT NULL,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
DECLARE
  v_before integer;
  v_after integer;
  v_accessory_name text;
  v_transaction_type text;
  v_effective_change integer;
BEGIN
  -- Determine transaction type based on change direction
  v_transaction_type := CASE WHEN p_change > 0 THEN 'restock' ELSE 'adjustment' END;

  -- Atomic update with CTE to correctly capture pre-update stock value
  -- (RETURNING only sees post-update values, so we need CTE for stock_before)
  WITH old_stock AS (
    SELECT current_stock, name
    FROM public.accessories
    WHERE id = p_accessory_id
  )
  UPDATE public.accessories
  SET
    current_stock = GREATEST(0, current_stock + p_change),
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

COMMENT ON FUNCTION public.adjust_accessory_stock IS
'Adjust accessory stock atomically with logging. Fixed: now includes transaction_type in stock_transactions INSERT.';


-- ============================================================================
-- FIX 3: deduct_for_order (BOM-based deduction)
-- Adds transaction_type = 'order_deduction'
-- Adds SET search_path for security
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_for_order(
  p_order_id text,
  p_product_title text,
  p_store text,
  p_quantity integer DEFAULT 1,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
DECLARE
  v_bom_id uuid;
  v_item RECORD;
  v_deductions jsonb := '[]'::jsonb;
  v_before integer;
  v_after integer;
  v_deduct_qty integer;
  v_component_name text;
BEGIN
  -- Find matching BOM
  SELECT b.id INTO v_bom_id
  FROM public.boms b
  WHERE
    b.product_title ILIKE '%' || p_product_title || '%'
    AND (b.store = p_store OR b.store = 'both')
    AND b.is_active = true
  LIMIT 1;

  IF v_bom_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No matching BOM found for product: ' || p_product_title
    );
  END IF;

  -- Deduct each component
  FOR v_item IN
    SELECT bi.component_id, c.name, bi.quantity_required
    FROM public.bom_items bi
    JOIN public.components c ON c.id = bi.component_id
    WHERE bi.bom_id = v_bom_id AND c.is_active = true
  LOOP
    -- Calculate deduction quantity with proper rounding
    -- Multiply as numeric first to preserve precision, then round to nearest integer
    v_deduct_qty := ROUND((v_item.quantity_required::numeric * p_quantity::numeric))::integer;

    -- Atomic update with RETURNING to avoid race conditions
    -- Use a CTE to capture old value before update, then compute new clamped value
    WITH old_stock AS (
      SELECT current_stock, name
      FROM public.components
      WHERE id = v_item.component_id
    )
    UPDATE public.components
    SET
      current_stock = GREATEST(0, current_stock - v_deduct_qty),
      updated_at = now()
    FROM old_stock
    WHERE components.id = v_item.component_id
    RETURNING
      old_stock.current_stock,  -- old value (before update)
      components.current_stock,  -- new value (after update, clamped to 0)
      old_stock.name
    INTO v_before, v_after, v_component_name;

    -- Log transaction (FIX: added transaction_type)
    INSERT INTO public.stock_transactions (
      table_name, item_id, transaction_type, change_amount, stock_before, stock_after, reason, reference, created_by
    ) VALUES (
      'components', v_item.component_id, 'order_deduction', -v_deduct_qty, v_before, v_after,
      'order_complete', p_order_id, p_created_by
    );

    -- Track what was deducted
    v_deductions := v_deductions || jsonb_build_object(
      'component', v_component_name,
      'deducted', v_deduct_qty,
      'before', v_before,
      'after', v_after
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'bom_id', v_bom_id,
    'order_id', p_order_id,
    'quantity', p_quantity,
    'deductions', v_deductions
  );
END;
$$;

COMMENT ON FUNCTION public.deduct_for_order IS
'Deduct stock when order is complete (BOM-based). Fixed: now includes transaction_type in stock_transactions INSERT.';
