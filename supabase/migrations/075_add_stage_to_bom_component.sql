-- Migration: 075_add_stage_to_bom_component.sql
-- Purpose: Add stage parameter to add_bom_component RPC
--          so BOM items can specify which production stage consumes the component

BEGIN;

-- Update add_bom_component to support stage
CREATE OR REPLACE FUNCTION public.add_bom_component(
  p_bom_id uuid, 
  p_component_id uuid, 
  p_quantity_required numeric, 
  p_unit text DEFAULT 'each'::text, 
  p_is_optional boolean DEFAULT false, 
  p_notes text DEFAULT NULL::text,
  p_stage text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_item_id uuid;
BEGIN
  INSERT INTO public.bom_items (bom_id, component_id, quantity_required, unit, is_optional, notes, stage_to_consume)
  VALUES (p_bom_id, p_component_id, p_quantity_required, p_unit, p_is_optional, p_notes, p_stage)
  ON CONFLICT (bom_id, component_id) 
  DO UPDATE SET 
    quantity_required = p_quantity_required,
    unit = p_unit,
    is_optional = p_is_optional,
    notes = p_notes,
    stage_to_consume = p_stage
  RETURNING id INTO v_item_id;
  
  RETURN v_item_id;
END;
$function$;

COMMIT;

