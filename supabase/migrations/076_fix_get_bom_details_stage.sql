-- Migration: Update get_bom_details to include stage_to_consume
-- Purpose: The UI needs to fetch BOM items with stage information when editing a BOM
-- Issue: The original RPC didn't return stage_to_consume, and getBoms doesn't return items at all

-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS public.get_bom_details(uuid);

CREATE OR REPLACE FUNCTION public.get_bom_details(p_bom_id uuid)
 RETURNS TABLE(
   bom_id uuid, 
   product_title text, 
   store text, 
   description text, 
   component_id uuid, 
   component_sku text, 
   component_name text, 
   quantity_required numeric, 
   unit text, 
   current_stock numeric, 
   is_optional boolean, 
   notes text,
   stage_to_consume text  -- Added: needed by UI for stage editing
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as bom_id,
    b.product_title,
    b.store,
    b.description,
    c.id as component_id,
    c.sku as component_sku,
    c.name as component_name,
    bi.quantity_required,
    bi.unit,
    c.current_stock,
    bi.is_optional,
    bi.notes,
    bi.stage_to_consume  -- Now included in result
  FROM public.boms b
  LEFT JOIN public.bom_items bi ON b.id = bi.bom_id
  LEFT JOIN public.components c ON bi.component_id = c.id
  WHERE b.id = p_bom_id
  ORDER BY bi.is_optional, c.name;
END;
$function$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

