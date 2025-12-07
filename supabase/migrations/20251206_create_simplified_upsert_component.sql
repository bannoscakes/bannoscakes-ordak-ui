-- ============================================================================
-- Create simplified upsert_component function
-- This runs AFTER 20251205_fix_all_inventory_audit_log.sql (timestamp 20251206 > 20251205).
-- We drop the legacy 13-parameter version created by 20251205 and replace it with
-- our simplified 8-parameter version that matches the new RPC client interface.
-- ============================================================================

-- Drop the legacy 13-parameter version created by 20251205_fix_all_inventory_audit_log.sql
DROP FUNCTION IF EXISTS public.upsert_component(text, text, uuid, text, text, text, numeric, numeric, numeric, numeric, text, text, boolean) CASCADE;

-- Create simplified upsert_component that matches the new RPC client interface
CREATE OR REPLACE FUNCTION public.upsert_component(
  p_id uuid DEFAULT NULL,
  p_sku text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category text DEFAULT 'other',
  p_min_stock integer DEFAULT 0,
  p_unit text DEFAULT 'each',
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    -- Try to update existing component
    UPDATE public.components SET
      sku = COALESCE(p_sku, sku),
      name = COALESCE(p_name, name),
      description = p_description,
      category = COALESCE(p_category, category),
      min_stock = COALESCE(p_min_stock, min_stock),
      unit = COALESCE(p_unit, unit),
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;

    -- If UPDATE matched no rows (component was deleted), raise error
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Component with id % not found. It may have been deleted by another user.', p_id
        USING HINT = 'Refresh the page to get the latest data',
              ERRCODE = 'P0002';  -- no_data_found
    END IF;
  ELSE
    -- Insert new component
    INSERT INTO public.components (sku, name, description, category, min_stock, unit, is_active)
    VALUES (p_sku, p_name, p_description, p_category, p_min_stock, p_unit, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_component IS 'Simplified upsert_component matching new RPC client interface. Creates or updates components without legacy fields (current_stock, max_stock, cost_per_unit, supplier).';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.upsert_component TO authenticated;
