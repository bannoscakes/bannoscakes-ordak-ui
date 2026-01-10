-- ============================================================================
-- Migration: Real-time Inventory Sync to Shopify
-- Purpose: Sync inventory to Shopify immediately when stock hits zero
-- Changes:
--   1. Update trigger to use SKU for accessories (instead of variant_id)
--   2. Call edge function immediately via pg_net when stock hits zero
--   3. Remove the 5-minute cron job (no longer needed)
--   4. Store edge function URL in settings table (not hardcoded)
--
-- Dependencies:
--   - pg_net extension must be enabled (for HTTP calls from triggers)
--   - vault.decrypted_secrets must contain 'service_role_key'
--   - settings table with global.supabase_project_url setting
--
-- Fallback: If pg_net call fails, items remain in queue and can be processed
--           manually by calling the edge function with empty body.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure pg_net extension is available
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- STEP 1.5: Supabase project URL must be configured manually per environment
-- ============================================================================
-- IMPORTANT: After running this migration, configure the project URL:
--   INSERT INTO settings (store, key, value)
--   VALUES ('global', 'supabase_project_url', '"https://YOUR-PROJECT.supabase.co"');
--
-- This is NOT inserted automatically to avoid hardcoding production URLs in migrations.

-- ============================================================================
-- STEP 2: Remove the cron job (no longer needed with real-time sync)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-inventory-to-shopify') THEN
      PERFORM cron.unschedule('sync-inventory-to-shopify');
      RAISE NOTICE 'Removed sync-inventory-to-shopify cron job (replaced with real-time sync)';
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 3: Update the inventory deduction trigger function
-- Changes:
--   - Use SKU instead of shopify_variant_id for accessories
--   - Call edge function immediately via pg_net when stock hits zero
--   - Same logic for both accessories and cake_toppers
--   - Handles concurrent inserts gracefully (ON CONFLICT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_accessory jsonb;
  v_accessory_title text;
  v_accessory_qty integer;
  v_matched_accessory record;
  v_matched_topper record;
  v_new_stock integer;
  v_queue_id uuid;
  v_service_role_key text;
  v_supabase_url text;
  v_edge_function_url text;
BEGIN
  -- Get Supabase project URL from settings (configurable per environment)
  SELECT (value #>> '{}')::text INTO v_supabase_url
  FROM public.settings
  WHERE store = 'global' AND key = 'supabase_project_url';

  IF v_supabase_url IS NOT NULL THEN
    v_edge_function_url := v_supabase_url || '/functions/v1/sync-inventory-to-shopify';
  END IF;
  -- ========================================
  -- PART 1: Deduct accessories stock
  -- ========================================
  -- accessories column is JSONB array: [{"title": "Number 5 Candle", "quantity": 1}, ...]

  IF NEW.accessories IS NOT NULL AND jsonb_array_length(NEW.accessories) > 0 THEN
    FOR v_accessory IN SELECT * FROM jsonb_array_elements(NEW.accessories)
    LOOP
      v_accessory_title := v_accessory->>'title';
      v_accessory_qty := COALESCE((v_accessory->>'quantity')::integer, 1);

      -- Find matching accessory by keyword (ILIKE match)
      -- Escape special LIKE characters in product_match to ensure literal matching
      SELECT id, name, sku, current_stock
      INTO v_matched_accessory
      FROM public.accessories
      WHERE is_active = true
        AND v_accessory_title ILIKE '%' ||
            replace(replace(replace(product_match, '\', '\\'), '%', '\%'), '_', '\_')
            || '%' ESCAPE '\'
      LIMIT 1;

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
            change_amount,
            stock_before,
            stock_after,
            reason,
            reference,
            created_by
          ) VALUES (
            'accessories',
            v_matched_accessory.id,
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

        -- Sync to Shopify IMMEDIATELY if stock just crossed from positive to zero/negative
        -- Uses SKU to find product in both Shopify stores
        IF v_matched_accessory.current_stock > 0 AND v_new_stock <= 0 AND v_matched_accessory.sku IS NOT NULL THEN
          BEGIN
            -- Insert into queue for audit trail (or get existing if already pending)
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
            )
            ON CONFLICT (item_type, item_id) WHERE status = 'pending'
            DO UPDATE SET created_at = now() -- Touch timestamp to show retry
            RETURNING id INTO v_queue_id;

            -- Get service role key from vault for edge function call
            SELECT decrypted_secret INTO v_service_role_key
            FROM vault.decrypted_secrets
            WHERE name = 'service_role_key';

            -- Call edge function immediately via pg_net (non-blocking)
            IF v_service_role_key IS NOT NULL AND v_edge_function_url IS NOT NULL THEN
              PERFORM net.http_post(
                url := v_edge_function_url,
                headers := jsonb_build_object(
                  'Authorization', 'Bearer ' || v_service_role_key,
                  'Content-Type', 'application/json'
                ),
                body := jsonb_build_object(
                  'queue_id', v_queue_id,
                  'item_type', 'accessory',
                  'item_id', v_matched_accessory.id,
                  'sku', v_matched_accessory.sku
                )
              );
            ELSIF v_service_role_key IS NULL THEN
              RAISE WARNING 'service_role_key not found in vault - Shopify sync queued but not triggered for accessory %', v_matched_accessory.name;
            ELSIF v_edge_function_url IS NULL THEN
              RAISE WARNING 'supabase_project_url not configured in settings - Shopify sync queued but not triggered for accessory %', v_matched_accessory.name;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to trigger Shopify sync for accessory %: %', v_matched_accessory.name, SQLERRM;
          END;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ========================================
  -- PART 2: Deduct cake_toppers stock
  -- ========================================
  -- Match by EXACT product_title (name_1 OR name_2)

  IF NEW.product_title IS NOT NULL AND trim(NEW.product_title) != '' THEN
    SELECT id, name_1, name_2, current_stock, shopify_product_id_1, shopify_product_id_2
    INTO v_matched_topper
    FROM public.cake_toppers
    WHERE is_active = true
      AND (
        name_1 = NEW.product_title
        OR name_2 = NEW.product_title
      )
    LIMIT 1;

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
          change_amount,
          stock_before,
          stock_after,
          reason,
          reference,
          created_by
        ) VALUES (
          'cake_toppers',
          v_matched_topper.id,
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

      -- Sync to Shopify IMMEDIATELY if stock just crossed from positive to zero/negative
      -- Uses product IDs to find products in both Shopify stores
      IF v_matched_topper.current_stock > 0 AND v_new_stock <= 0 THEN
        IF v_matched_topper.shopify_product_id_1 IS NOT NULL
           OR v_matched_topper.shopify_product_id_2 IS NOT NULL THEN
          BEGIN
            -- Insert into queue for audit trail (or get existing if already pending)
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
            )
            ON CONFLICT (item_type, item_id) WHERE status = 'pending'
            DO UPDATE SET created_at = now() -- Touch timestamp to show retry
            RETURNING id INTO v_queue_id;

            -- Get service role key from vault for edge function call
            SELECT decrypted_secret INTO v_service_role_key
            FROM vault.decrypted_secrets
            WHERE name = 'service_role_key';

            -- Call edge function immediately via pg_net (non-blocking)
            IF v_service_role_key IS NOT NULL AND v_edge_function_url IS NOT NULL THEN
              PERFORM net.http_post(
                url := v_edge_function_url,
                headers := jsonb_build_object(
                  'Authorization', 'Bearer ' || v_service_role_key,
                  'Content-Type', 'application/json'
                ),
                body := jsonb_build_object(
                  'queue_id', v_queue_id,
                  'item_type', 'cake_topper',
                  'item_id', v_matched_topper.id,
                  'product_id_1', v_matched_topper.shopify_product_id_1,
                  'product_id_2', v_matched_topper.shopify_product_id_2
                )
              );
            ELSIF v_service_role_key IS NULL THEN
              RAISE WARNING 'service_role_key not found in vault - Shopify sync queued but not triggered for cake_topper %', v_matched_topper.name_1;
            ELSIF v_edge_function_url IS NULL THEN
              RAISE WARNING 'supabase_project_url not configured in settings - Shopify sync queued but not triggered for cake_topper %', v_matched_topper.name_1;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to trigger Shopify sync for cake_topper %: %', v_matched_topper.name_1, SQLERRM;
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

COMMENT ON FUNCTION public.deduct_inventory_on_order IS
'Trigger function to deduct inventory when orders are inserted.
Matches accessories by keyword, cake_toppers by exact product_title.
Immediately syncs to Shopify via pg_net when stock hits zero.
Never fails the order insert.

Configuration:
- Edge function URL is read from settings table (global.supabase_project_url)
- For dev/staging, update the settings value in the database

Dependencies:
- pg_net extension (for HTTP calls)
- vault.decrypted_secrets with service_role_key
- settings table with supabase_project_url
- sync-inventory-to-shopify edge function

Fallback: If pg_net fails, items remain in queue for manual processing.';

COMMIT;
