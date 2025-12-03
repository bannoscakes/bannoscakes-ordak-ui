-- Fix inventory functions to safely handle audit logging
-- Issue: Foreign key constraint violations when user doesn't exist in staff_shared table
-- Solution: Check if user exists before attempting to insert into audit_log

-- Function 1/2: Fix upsert_component to safely handle audit logging
CREATE OR REPLACE FUNCTION public.upsert_component(
  p_sku text, 
  p_name text, 
  p_id uuid DEFAULT NULL::uuid, 
  p_description text DEFAULT NULL::text, 
  p_category text DEFAULT NULL::text, 
  p_unit text DEFAULT 'each'::text, 
  p_current_stock numeric DEFAULT 0, 
  p_min_stock numeric DEFAULT 0, 
  p_max_stack numeric DEFAULT NULL::numeric, 
  p_cost_per_unit numeric DEFAULT NULL::numeric, 
  p_supplier text DEFAULT NULL::text, 
  p_supplier_sku text DEFAULT NULL::text, 
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_component_id uuid;
  v_user_id uuid;
  v_user_exists boolean;
BEGIN
  -- Get user ID for audit log (only if user is authenticated)
  v_user_id := auth.uid();

  -- Upsert component
  INSERT INTO public.components (
    id, sku, name, description, category, unit, 
    current_stock, min_stock, max_stock, cost_per_unit, 
    supplier, supplier_sku
  ) VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_sku, p_name, p_description, p_category, p_unit,
    p_current_stock, p_min_stock, p_max_stock, p_cost_per_unit,
    p_supplier, p_supplier_sku
  )
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    current_stock = EXCLUDED.current_stock,
    min_stock = EXCLUDED.min_stock,
    max_stock = EXCLUDED.max_stock,
    cost_per_unit = EXCLUDED.cost_per_unit,
    supplier = EXCLUDED.supplier,
    supplier_sku = EXCLUDED.supplier_sku,
    updated_at = now()
  RETURNING id INTO v_component_id;

  -- Log the action (only if we have a valid user ID that exists in staff_shared)
  IF v_user_id IS NOT NULL THEN
    -- Check if user exists in staff_shared table (audit_log foreign key constraint)
    SELECT EXISTS(
      SELECT 1 FROM public.staff_shared WHERE user_id = v_user_id
    ) INTO v_user_exists;
    
    -- Only insert into audit_log if user exists (prevents foreign key violation)
    IF v_user_exists THEN
      INSERT INTO public.audit_log (
        action,
        performed_by,
        source,
        meta
      ) VALUES (
        CASE WHEN p_id IS NOT NULL THEN 'update_component' ELSE 'create_component' END,
        v_user_id,
        'inventory_system',
        jsonb_build_object(
          'component_id', v_component_id,
          'sku', p_sku,
          'name', p_name,
          'category', p_category
        )
      );
    END IF;
  END IF;

  RETURN v_component_id;
END;
$function$;

-- Function 2/2: Fix update_component_stock to safely handle audit logging
CREATE OR REPLACE FUNCTION public.update_component_stock(
  p_component_id uuid, 
  p_delta numeric, 
  p_reason text, 
  p_order_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_old_stock numeric;
  v_new_stock numeric;
  v_user_id uuid;
  v_component_name text;
  v_user_exists boolean;
BEGIN
  -- Get current user (or NULL if not authenticated)
  v_user_id := auth.uid();
  
  -- Get current stock and component name
  SELECT current_stock, name INTO v_old_stock, v_component_name
  FROM public.components 
  WHERE id = p_component_id;
  
  IF v_old_stock IS NULL THEN
    RAISE EXCEPTION 'Component not found: %', p_component_id;
  END IF;
  
  -- Calculate new stock
  v_new_stock := v_old_stock + p_delta;
  
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_old_stock, ABS(p_delta);
  END IF;
  
  -- Update component stock
  UPDATE public.components 
  SET 
    current_stock = v_new_stock,
    updated_at = now()
  WHERE id = p_component_id;
  
  -- Log the transaction (only if we have a valid user ID that exists in staff_shared)
  IF v_user_id IS NOT NULL THEN
    -- Check if user exists in staff_shared table (audit_log foreign key constraint)
    SELECT EXISTS(
      SELECT 1 FROM public.staff_shared WHERE user_id = v_user_id
    ) INTO v_user_exists;
    
    -- Only insert into audit_log if user exists (prevents foreign key violation)
    IF v_user_exists THEN
      INSERT INTO public.audit_log (
        action,
        performed_by,
        source,
        meta
      ) VALUES (
        'update_stock',
        v_user_id,
        'inventory_system',
        jsonb_build_object(
          'component_id', p_component_id,
          'component_name', v_component_name,
          'old_stock', v_old_stock,
          'new_stock', v_new_stock,
          'delta', p_delta,
          'reason', p_reason,
          'order_id', COALESCE(p_order_id, 'N/A')
        )
      );
    END IF;
  END IF;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'component_id', p_component_id,
    'old_stock', v_old_stock,
    'new_stock', v_new_stock,
    'delta', p_delta
  );
END;
$function$;
