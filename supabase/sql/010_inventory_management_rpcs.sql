-- 010_inventory_management_rpcs.sql
-- Phase 6: Inventory Management RPCs
-- Implements component/inventory management, stock tracking, and BOM

-- =============================================
-- COMPONENT MANAGEMENT RPCs
-- =============================================

-- Get all components with optional filtering
CREATE OR REPLACE FUNCTION public.get_components(
  p_category text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_low_stock_only boolean DEFAULT false,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  description text,
  category text,
  unit text,
  current_stock numeric,
  min_stock numeric,
  max_stock numeric,
  cost_per_unit numeric,
  supplier text,
  supplier_sku text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view components
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view components';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.sku,
    c.name,
    c.description,
    c.category,
    c.unit,
    c.current_stock,
    c.min_stock,
    c.max_stock,
    c.cost_per_unit,
    c.supplier,
    c.supplier_sku,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM public.components c
  WHERE (p_category IS NULL OR c.category = p_category)
    AND (p_is_active IS NULL OR c.is_active = p_is_active)
    AND (NOT p_low_stock_only OR c.current_stock < c.min_stock)
    AND (p_search IS NULL OR 
         c.name ILIKE '%' || p_search || '%' OR 
         c.sku ILIKE '%' || p_search || '%' OR
         c.description ILIKE '%' || p_search || '%')
  ORDER BY c.name
  LIMIT p_limit;
END;
$$;

-- Get single component by ID or SKU
CREATE OR REPLACE FUNCTION public.get_component(
  p_id uuid DEFAULT NULL,
  p_sku text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  description text,
  category text,
  unit text,
  current_stock numeric,
  min_stock numeric,
  max_stock numeric,
  cost_per_unit numeric,
  supplier text,
  supplier_sku text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view components
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view components';
  END IF;

  -- Must provide either ID or SKU
  IF p_id IS NULL AND p_sku IS NULL THEN
    RAISE EXCEPTION 'Must provide either component ID or SKU';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.sku,
    c.name,
    c.description,
    c.category,
    c.unit,
    c.current_stock,
    c.min_stock,
    c.max_stock,
    c.cost_per_unit,
    c.supplier,
    c.supplier_sku,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM public.components c
  WHERE (p_id IS NOT NULL AND c.id = p_id)
     OR (p_sku IS NOT NULL AND c.sku = p_sku);
END;
$$;

-- Create or update component
CREATE OR REPLACE FUNCTION public.upsert_component(
  p_id uuid DEFAULT NULL,
  p_sku text,
  p_name text,
  p_description text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_unit text DEFAULT 'each',
  p_current_stock numeric DEFAULT 0,
  p_min_stock numeric DEFAULT 0,
  p_max_stock numeric DEFAULT NULL,
  p_cost_per_unit numeric DEFAULT NULL,
  p_supplier text DEFAULT NULL,
  p_supplier_sku text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_component_id uuid;
  v_user_id uuid;
BEGIN
  -- Check if user has permission to manage components
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to manage components';
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Upsert component
  IF p_id IS NOT NULL THEN
    -- Update existing component
    UPDATE public.components
    SET 
      sku = p_sku,
      name = p_name,
      description = p_description,
      category = p_category,
      unit = p_unit,
      current_stock = p_current_stock,
      min_stock = p_min_stock,
      max_stock = p_max_stock,
      cost_per_unit = p_cost_per_unit,
      supplier = p_supplier,
      supplier_sku = p_supplier_sku,
      is_active = p_is_active,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_component_id;
  ELSE
    -- Insert new component
    INSERT INTO public.components (
      sku, name, description, category, unit, current_stock, min_stock, max_stock,
      cost_per_unit, supplier, supplier_sku, is_active
    ) VALUES (
      p_sku, p_name, p_description, p_category, p_unit, p_current_stock, p_min_stock, p_max_stock,
      p_cost_per_unit, p_supplier, p_supplier_sku, p_is_active
    )
    RETURNING id INTO v_component_id;
  END IF;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, new_values, actor_id, store, order_id
  ) VALUES (
    'components', v_component_id::text, 
    CASE WHEN p_id IS NOT NULL THEN 'update_component' ELSE 'create_component' END,
    jsonb_build_object(
      'sku', p_sku,
      'name', p_name,
      'current_stock', p_current_stock
    ),
    v_user_id, 'global', NULL
  );

  RETURN v_component_id;
END;
$$;

-- Update component stock
CREATE OR REPLACE FUNCTION public.update_component_stock(
  p_component_id uuid,
  p_quantity_change numeric,
  p_reason text DEFAULT NULL,
  p_reference_order_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_stock numeric;
  v_new_stock numeric;
  v_user_id uuid;
  v_stage_user_id uuid;
BEGIN
  -- Check if user has permission to update stock
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to update stock';
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- For stage_events, only use valid user IDs
  SELECT user_id INTO v_stage_user_id 
  FROM public.staff_shared 
  WHERE user_id = auth.uid() AND is_active = true;

  -- Get current stock
  SELECT current_stock INTO v_old_stock
  FROM public.components
  WHERE id = p_component_id;

  IF v_old_stock IS NULL THEN
    RAISE EXCEPTION 'Component not found';
  END IF;

  -- Calculate new stock
  v_new_stock := v_old_stock + p_quantity_change;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock (current: %, change: %)', v_old_stock, p_quantity_change;
  END IF;

  -- Update stock
  UPDATE public.components
  SET 
    current_stock = v_new_stock,
    updated_at = now()
  WHERE id = p_component_id;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, actor_id, store, order_id
  ) VALUES (
    'components', p_component_id::text, 'update_stock',
    jsonb_build_object('old_stock', v_old_stock),
    jsonb_build_object(
      'new_stock', v_new_stock,
      'change', p_quantity_change,
      'reason', p_reason,
      'reference_order', p_reference_order_id
    ),
    v_user_id, 'global', p_reference_order_id
  );

  RETURN true;
END;
$$;

-- Get low stock components
CREATE OR REPLACE FUNCTION public.get_low_stock_components()
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  category text,
  unit text,
  current_stock numeric,
  min_stock numeric,
  stock_deficit numeric,
  supplier text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view components
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view components';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.sku,
    c.name,
    c.category,
    c.unit,
    c.current_stock,
    c.min_stock,
    (c.min_stock - c.current_stock) as stock_deficit,
    c.supplier
  FROM public.components c
  WHERE c.current_stock < c.min_stock
    AND c.is_active = true
  ORDER BY (c.min_stock - c.current_stock) DESC;
END;
$$;

-- Get inventory value summary
CREATE OR REPLACE FUNCTION public.get_inventory_value()
RETURNS TABLE (
  total_components bigint,
  active_components bigint,
  low_stock_count bigint,
  total_value numeric,
  categories jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view inventory
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to view inventory';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_components,
    COUNT(*) FILTER (WHERE is_active = true)::bigint as active_components,
    COUNT(*) FILTER (WHERE current_stock < min_stock AND is_active = true)::bigint as low_stock_count,
    SUM(current_stock * COALESCE(cost_per_unit, 0))::numeric as total_value,
    jsonb_object_agg(
      COALESCE(category, 'Uncategorized'),
      jsonb_build_object(
        'count', category_count,
        'value', category_value
      )
    ) as categories
  FROM (
    SELECT 
      category,
      COUNT(*)::bigint as category_count,
      SUM(current_stock * COALESCE(cost_per_unit, 0))::numeric as category_value
    FROM public.components
    WHERE is_active = true
    GROUP BY category
  ) cat_summary;
END;
$$;

-- Bulk update component stock (for multiple components at once)
CREATE OR REPLACE FUNCTION public.bulk_update_component_stock(
  p_updates jsonb,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_update jsonb;
  v_component_id uuid;
  v_quantity_change numeric;
BEGIN
  -- Check if user has permission to update stock
  IF NOT public.check_user_role('Staff') THEN
    RAISE EXCEPTION 'Insufficient permissions to update stock';
  END IF;

  -- Process each update
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    v_component_id := (v_update->>'component_id')::uuid;
    v_quantity_change := (v_update->>'quantity_change')::numeric;
    
    -- Update individual component stock
    PERFORM public.update_component_stock(
      v_component_id,
      v_quantity_change,
      p_reason,
      v_update->>'reference_order_id'
    );
  END LOOP;

  RETURN true;
END;
$$;

-- Deactivate component (soft delete)
CREATE OR REPLACE FUNCTION public.deactivate_component(
  p_component_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_values jsonb;
  v_user_id uuid;
BEGIN
  -- Check if user has permission to manage components
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to deactivate components';
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Get current values for audit log
  SELECT to_jsonb(c.*) INTO v_old_values
  FROM public.components c
  WHERE c.id = p_component_id;

  -- Deactivate component
  UPDATE public.components 
  SET is_active = false, updated_at = now()
  WHERE id = p_component_id;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, actor_id, store, order_id
  ) VALUES (
    'components', p_component_id::text, 'deactivate_component',
    v_old_values,
    jsonb_build_object('is_active', false),
    v_user_id, 'global', NULL
  );

  RETURN FOUND;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

-- Grant execute permissions on all inventory management functions
GRANT EXECUTE ON FUNCTION public.get_components(text, boolean, boolean, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_component(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_component(uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_component_stock(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_low_stock_components() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_value() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_component_stock(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_component(uuid) TO authenticated;
