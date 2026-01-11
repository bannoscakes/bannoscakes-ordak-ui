-- ============================================================================
-- Migration: Refactor Accessory Inventory Sync to Use SKU
-- Purpose: Change accessories from shopify_variant_id to SKU-based queue items
-- This enables multi-store sync (same SKU can exist in Bannos AND Flourlane)
-- ============================================================================

-- ============================================================================
-- Update deduct_inventory_on_order() function
-- Changes for accessories ONLY:
-- 1. SELECT sku instead of shopify_variant_id
-- 2. Check sku IS NOT NULL instead of shopify_variant_id IS NOT NULL
-- 3. Queue {sku: ...} instead of {variant_id: ...}
-- Cake topper logic remains unchanged (uses product_id_1, product_id_2)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      -- CHANGED: Select sku instead of shopify_variant_id
      SELECT id, name, current_stock, sku
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

        -- Log the transaction
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
        -- CHANGED: Check sku instead of shopify_variant_id, queue {sku} instead of {variant_id}
        --
        -- NOTE: Race condition is acceptable here. If two concurrent transactions both see
        -- the stock transition (positive→zero), duplicate queue entries may be created.
        -- This is harmless because: (1) Shopify API is idempotent (setting inventory to 0
        -- twice has no side effects), (2) edge function claims items atomically via RPC.
        -- Worst case is minor duplicate work, not data corruption.
        IF v_matched_accessory.current_stock > 0 AND v_new_stock <= 0 AND v_matched_accessory.sku IS NOT NULL THEN
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
              jsonb_build_object('sku', v_matched_accessory.sku)
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
  -- NOTE: This section is UNCHANGED - cake toppers still use product_id_1, product_id_2

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

      -- Log the transaction
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
      --
      -- NOTE: Race condition is acceptable here. If two concurrent transactions both see
      -- the stock transition (positive→zero), duplicate queue entries may be created.
      -- This is harmless because: (1) Shopify API is idempotent (setting inventory to 0
      -- twice has no side effects), (2) edge function claims items atomically via RPC.
      -- Worst case is minor duplicate work, not data corruption.
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
'Deducts inventory when orders are inserted. Accessories use SKU-based sync (multi-store). Cake toppers use Product ID sync (multi-store). Logs to stock_transactions with transaction_type.';
