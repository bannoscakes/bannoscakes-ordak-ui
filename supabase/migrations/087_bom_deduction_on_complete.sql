-- ============================================================================
-- Migration: Wire up BOM deduction when order stage changes to Complete
-- Purpose: Call deduct_inventory_for_order to deduct components from BOMs
-- Trigger: AFTER UPDATE when stage changes to 'Complete'
-- Note: stage_type enum is (Filling, Covering, Decorating, Packing, Complete)
-- Note: This is SEPARATE from the INSERT triggers (083) that deduct accessories/cake_toppers
-- ============================================================================

-- ============================================================================
-- STEP 1: Create trigger function for BOM deduction on Complete
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_bom_on_order_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store text;
  v_result jsonb;
BEGIN
  -- Determine store from trigger table name
  IF TG_TABLE_NAME = 'orders_bannos' THEN
    v_store := 'bannos';
  ELSIF TG_TABLE_NAME = 'orders_flourlane' THEN
    v_store := 'flourlane';
  ELSE
    RAISE WARNING 'Unknown table for BOM deduction trigger: %', TG_TABLE_NAME;
    RETURN NEW;
  END IF;

  -- Call the existing deduct_inventory_for_order function
  -- This function already:
  -- 1. Checks the inventory_tracking_enabled feature flag
  -- 2. Looks up the BOM by product_title
  -- 3. Deducts components from the components table
  -- 4. Logs to stock_transactions
  -- 5. Has idempotency protection (won't double-deduct)
  BEGIN
    v_result := public.deduct_inventory_for_order(
      p_order_id := NEW.id::text,
      p_store := v_store,
      p_product_title := NEW.product_title,
      p_quantity := COALESCE(NEW.item_qty, 1)
    );

    -- Log result for debugging (can be removed in production)
    IF v_result->>'status' = 'skipped' THEN
      RAISE NOTICE 'BOM deduction skipped for order %: %', NEW.id, v_result->>'reason';
    ELSE
      RAISE NOTICE 'BOM deduction completed for order %: % components updated', NEW.id, jsonb_array_length(COALESCE(v_result->'updates', '[]'::jsonb));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the order update if deduction fails
    RAISE WARNING 'BOM deduction failed for order %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.deduct_bom_on_order_complete IS 'Trigger function to deduct BOM components when order stage changes to Complete/Done. Respects inventory_tracking_enabled feature flag.';

-- ============================================================================
-- STEP 2: Create triggers on order tables (AFTER UPDATE, not INSERT)
-- ============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trg_deduct_bom_on_complete_bannos ON public.orders_bannos;
DROP TRIGGER IF EXISTS trg_deduct_bom_on_complete_flourlane ON public.orders_flourlane;

-- Create trigger for Bannos orders
-- Fires when stage changes TO 'Complete' (from any other stage)
-- Note: stage_type enum only has: Filling, Covering, Decorating, Packing, Complete
CREATE TRIGGER trg_deduct_bom_on_complete_bannos
AFTER UPDATE ON public.orders_bannos
FOR EACH ROW
WHEN (
  NEW.stage = 'Complete' AND OLD.stage IS DISTINCT FROM NEW.stage
)
EXECUTE FUNCTION public.deduct_bom_on_order_complete();

-- Create trigger for Flourlane orders
CREATE TRIGGER trg_deduct_bom_on_complete_flourlane
AFTER UPDATE ON public.orders_flourlane
FOR EACH ROW
WHEN (
  NEW.stage = 'Complete' AND OLD.stage IS DISTINCT FROM NEW.stage
)
EXECUTE FUNCTION public.deduct_bom_on_order_complete();

-- ============================================================================
-- Summary of triggers now on order tables:
--
-- ON INSERT (from 083_inventory_order_deduction.sql):
--   trg_deduct_inventory_bannos    → deduct_inventory_on_order() → accessories/cake_toppers
--   trg_deduct_inventory_flourlane → deduct_inventory_on_order() → accessories/cake_toppers
--
-- ON UPDATE to Complete (this migration):
--   trg_deduct_bom_on_complete_bannos    → deduct_bom_on_order_complete() → BOM components
--   trg_deduct_bom_on_complete_flourlane → deduct_bom_on_order_complete() → BOM components
-- ============================================================================
