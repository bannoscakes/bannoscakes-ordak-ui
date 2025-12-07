-- ============================================================================
-- Migration: Inventory Order Deduction (PR 2)
-- Purpose: Auto-deduct inventory when orders are created
-- - Add shopify_variant_id to accessories table
-- - Create trigger to deduct accessories stock (keyword match)
-- - Create trigger to deduct cake_toppers stock (exact product_title match)
-- - Queue Shopify sync when stock reaches 0
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add shopify_variant_id to accessories table
-- ============================================================================

ALTER TABLE public.accessories
ADD COLUMN IF NOT EXISTS shopify_variant_id text DEFAULT NULL;

COMMENT ON COLUMN public.accessories.shopify_variant_id IS 'Shopify variant ID for setting out of stock via Inventory API when stock = 0';

CREATE INDEX IF NOT EXISTS idx_accessories_shopify_variant_id
ON public.accessories(shopify_variant_id)
WHERE shopify_variant_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Create inventory sync queue table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('accessory', 'cake_topper')),
  item_id uuid NOT NULL,
  sync_action text NOT NULL CHECK (sync_action IN ('set_out_of_stock')),
  shopify_ids jsonb NOT NULL, -- {"variant_id": "..."} or {"product_id_1": "...", "product_id_2": "..."}
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_sync_queue_status
ON public.inventory_sync_queue(status)
WHERE status = 'pending';

COMMENT ON TABLE public.inventory_sync_queue IS 'Queue for syncing inventory changes to Shopify. Processed by sync-inventory-to-shopify edge function.';

-- Unique constraint to prevent duplicate pending jobs for the same item
-- This is a DB-level safeguard in addition to the trigger logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sync_queue_pending_unique
ON public.inventory_sync_queue(item_type, item_id)
WHERE status = 'pending';

-- ============================================================================
-- STEP 3: Create the inventory deduction trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accessory jsonb;
  v_accessory_title text;
  v_accessory_qty integer;
  v_matched_accessory record;
  v_matched_topper record;
  v_new_stock integer;
BEGIN
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
      SELECT id, name, current_stock, shopify_variant_id
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

COMMENT ON FUNCTION public.deduct_inventory_on_order IS 'Trigger function to deduct inventory when orders are inserted. Matches accessories by keyword, cake_toppers by exact product_title. Never fails the order insert.';

-- ============================================================================
-- STEP 4: Create triggers on order tables
-- ============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trg_deduct_inventory_bannos ON public.orders_bannos;
DROP TRIGGER IF EXISTS trg_deduct_inventory_flourlane ON public.orders_flourlane;

-- Create trigger for Bannos orders
CREATE TRIGGER trg_deduct_inventory_bannos
AFTER INSERT ON public.orders_bannos
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_on_order();

-- Create trigger for Flourlane orders
CREATE TRIGGER trg_deduct_inventory_flourlane
AFTER INSERT ON public.orders_flourlane
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_on_order();

-- ============================================================================
-- STEP 5: Atomic claim RPC for edge function
-- ============================================================================

-- This function atomically claims pending queue items to prevent race conditions
-- between concurrent cron runs. Uses FOR UPDATE SKIP LOCKED for safety.
-- Also recovers items stuck in 'processing' for more than 10 minutes (orphaned by crashes).
CREATE OR REPLACE FUNCTION public.claim_inventory_sync_items(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  item_type text,
  item_id uuid,
  sync_action text,
  shopify_ids jsonb,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First, recover any items stuck in 'processing' for more than 10 minutes
  -- These are likely orphaned by edge function crashes
  UPDATE inventory_sync_queue
  SET status = 'pending'
  WHERE status = 'processing'
    AND created_at < now() - interval '10 minutes';

  -- Then claim pending items
  RETURN QUERY
  WITH claimed AS (
    SELECT q.id
    FROM inventory_sync_queue q
    WHERE q.status = 'pending'
    ORDER BY q.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE inventory_sync_queue q
  SET status = 'processing'
  FROM claimed c
  WHERE q.id = c.id
  RETURNING q.id, q.item_type, q.item_id, q.sync_action, q.shopify_ids, q.status, q.created_at;
END;
$$;

COMMENT ON FUNCTION public.claim_inventory_sync_items IS 'Atomically claim pending inventory sync items for processing. Uses FOR UPDATE SKIP LOCKED to prevent race conditions.';

-- Grant execute to service_role only (edge function uses service role)
GRANT EXECUTE ON FUNCTION public.claim_inventory_sync_items(integer) TO service_role;

-- ============================================================================
-- STEP 6: RLS and Grants
-- ============================================================================

-- Enable RLS on queue table to prevent client manipulation
ALTER TABLE public.inventory_sync_queue ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated users - they cannot directly access this table
-- The trigger function runs as SECURITY DEFINER so it can insert
-- The edge function uses service_role which bypasses RLS

-- Service role gets full access (bypasses RLS anyway, but explicit is better)
GRANT SELECT, INSERT, UPDATE ON public.inventory_sync_queue TO service_role;

-- Authenticated users get NO direct access to the queue table
-- (Trigger function is SECURITY DEFINER so it can still insert)
REVOKE ALL ON public.inventory_sync_queue FROM authenticated;

COMMIT;
