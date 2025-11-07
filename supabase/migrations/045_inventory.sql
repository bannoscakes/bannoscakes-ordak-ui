-- Migration: Inventory and component management RPCs
-- Generated: 2025-11-07T05:15:46.197Z
-- Functions: 21

-- Function 1/21: add_bom_component
CREATE OR REPLACE FUNCTION public.add_bom_component(p_bom_id uuid, p_component_id uuid, p_quantity_required numeric, p_unit text DEFAULT 'each'::text, p_is_optional boolean DEFAULT false, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item_id uuid;
BEGIN
  INSERT INTO public.bom_items (bom_id, component_id, quantity_required, unit, is_optional, notes)
  VALUES (p_bom_id, p_component_id, p_quantity_required, p_unit, p_is_optional, p_notes)
  ON CONFLICT (bom_id, component_id) 
  DO UPDATE SET 
    quantity_required = p_quantity_required,
    unit = p_unit,
    is_optional = p_is_optional,
    notes = p_notes
  RETURNING id INTO v_item_id;
  
  RETURN v_item_id;
END;
$function$


-- Function 2/21: add_product_requirement
CREATE OR REPLACE FUNCTION public.add_product_requirement(p_shopify_product_id text, p_shopify_variant_id text, p_product_title text, p_component_id uuid, p_quantity_per_unit numeric, p_is_optional boolean DEFAULT false, p_auto_deduct boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_req_id uuid;
BEGIN
  INSERT INTO public.product_requirements (
    shopify_product_id, shopify_variant_id, product_title, 
    component_id, quantity_per_unit, is_optional, auto_deduct
  )
  VALUES (
    p_shopify_product_id, p_shopify_variant_id, p_product_title,
    p_component_id, p_quantity_per_unit, p_is_optional, p_auto_deduct
  )
  RETURNING id INTO v_req_id;
  
  RETURN v_req_id;
END;
$function$


-- Function 3/21: deduct_inventory_for_order
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order(p_order_id text, p_product_title text, p_store text, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_bom_id uuid;
  v_deducted_count integer := 0;
  v_item record;
  v_insufficient_stock text[];
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Find matching BOM
  SELECT id INTO v_bom_id
  FROM public.boms
  WHERE product_title = p_product_title
    AND (store = p_store OR store = 'both')
    AND is_active = true
  LIMIT 1;
  
  IF v_bom_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No BOM found for product: ' || p_product_title
    );
  END IF;
  
  -- Check if we have enough stock for all components
  FOR v_item IN
    SELECT bi.component_id, bi.quantity_required, c.name, c.current_stock, bi.is_optional
    FROM public.bom_items bi
    JOIN public.components c ON bi.component_id = c.id
    WHERE bi.bom_id = v_bom_id
  LOOP
    IF NOT v_item.is_optional AND v_item.current_stock < (v_item.quantity_required * p_quantity) THEN
      v_insufficient_stock := array_append(v_insufficient_stock, v_item.name);
    END IF;
  END LOOP;
  
  -- If insufficient stock, return error
  IF array_length(v_insufficient_stock, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock',
      'components', v_insufficient_stock
    );
  END IF;
  
  -- Deduct stock for each component
  FOR v_item IN
    SELECT bi.component_id, bi.quantity_required, c.current_stock
    FROM public.bom_items bi
    JOIN public.components c ON bi.component_id = c.id
    WHERE bi.bom_id = v_bom_id
      AND bi.is_optional = false
  LOOP
    -- Update stock
    UPDATE public.components
    SET current_stock = current_stock - (v_item.quantity_required * p_quantity),
        updated_at = now()
    WHERE id = v_item.component_id;
    
    -- Log transaction
    INSERT INTO public.stock_transactions (
      component_id, transaction_type, quantity_change,
      quantity_before, quantity_after, reference_order_id,
      reason, performed_by
    )
    VALUES (
      v_item.component_id,
      'order_deduction',
      -(v_item.quantity_required * p_quantity),
      v_item.current_stock,
      v_item.current_stock - (v_item.quantity_required * p_quantity),
      p_order_id,
      'Deducted for order completion',
      v_user_id
    );
    
    v_deducted_count := v_deducted_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'components_deducted', v_deducted_count
  );
END;
$function$


-- Function 4/21: delete_accessory_keyword
CREATE OR REPLACE FUNCTION public.delete_accessory_keyword(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.accessory_keywords WHERE id = p_id;
  RETURN true;
END;
$function$


-- Function 5/21: find_component_by_keyword
CREATE OR REPLACE FUNCTION public.find_component_by_keyword(p_keyword text)
 RETURNS TABLE(component_id uuid, component_name text, component_sku text, current_stock numeric, keyword_matched text, match_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as component_id,
    c.name as component_name,
    c.sku as component_sku,
    c.current_stock,
    ak.keyword as keyword_matched,
    ak.match_type
  FROM public.accessory_keywords ak
  JOIN public.components c ON ak.component_id = c.id
  WHERE ak.is_active = true
    AND c.is_active = true
    AND (
      (ak.match_type = 'exact' AND LOWER(ak.keyword) = LOWER(p_keyword)) OR
      (ak.match_type = 'contains' AND LOWER(p_keyword) LIKE '%' || LOWER(ak.keyword) || '%') OR
      (ak.match_type = 'starts_with' AND LOWER(p_keyword) LIKE LOWER(ak.keyword) || '%')
    )
  ORDER BY ak.priority DESC, LENGTH(ak.keyword) DESC
  LIMIT 1;
END;
$function$


-- Function 6/21: get_accessory_keywords
CREATE OR REPLACE FUNCTION public.get_accessory_keywords(p_search text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS TABLE(id uuid, keyword text, component_id uuid, component_name text, component_sku text, priority integer, match_type text, is_active boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id,
    ak.keyword,
    ak.component_id,
    c.name as component_name,
    c.sku as component_sku,
    ak.priority,
    ak.match_type,
    ak.is_active,
    ak.created_at
  FROM public.accessory_keywords ak
  JOIN public.components c ON ak.component_id = c.id
  WHERE (p_is_active IS NULL OR ak.is_active = p_is_active)
    AND (p_search IS NULL OR 
         ak.keyword ILIKE '%' || p_search || '%' OR 
         c.name ILIKE '%' || p_search || '%')
  ORDER BY ak.priority DESC, ak.keyword;
END;
$function$


-- Function 7/21: get_bom_details
CREATE OR REPLACE FUNCTION public.get_bom_details(p_bom_id uuid)
 RETURNS TABLE(bom_id uuid, product_title text, store text, description text, component_id uuid, component_sku text, component_name text, quantity_required numeric, unit text, current_stock numeric, is_optional boolean, notes text)
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
    bi.notes
  FROM public.boms b
  LEFT JOIN public.bom_items bi ON b.id = bi.bom_id
  LEFT JOIN public.components c ON bi.component_id = c.id
  WHERE b.id = p_bom_id
  ORDER BY bi.is_optional, c.name;
END;
$function$


-- Function 8/21: get_boms
CREATE OR REPLACE FUNCTION public.get_boms(p_store text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, product_title text, store text, description text, shopify_product_id text, is_active boolean, component_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.product_title,
    b.store,
    b.description,
    b.shopify_product_id,
    b.is_active,
    COUNT(bi.id)::bigint as component_count,
    b.created_at,
    b.updated_at
  FROM public.boms b
  LEFT JOIN public.bom_items bi ON b.id = bi.bom_id
  WHERE (p_store IS NULL OR b.store = p_store)
    AND (p_is_active IS NULL OR b.is_active = p_is_active)
    AND (p_search IS NULL OR b.product_title ILIKE '%' || p_search || '%')
  GROUP BY b.id, b.product_title, b.store, b.description, b.shopify_product_id, b.is_active, b.created_at, b.updated_at
  ORDER BY b.product_title;
END;
$function$


-- Function 9/21: get_components
CREATE OR REPLACE FUNCTION public.get_components()
 RETURNS TABLE(id uuid, sku text, name text, description text, category text, unit text, current_stock numeric, min_stock numeric, max_stock numeric, cost_per_unit numeric, supplier text, supplier_sku text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.sku, c.name, c.description, c.category, c.unit,
    c.current_stock, c.min_stock, c.max_stock, c.cost_per_unit,
    c.supplier, c.supplier_sku, c.is_active, c.created_at, c.updated_at
  FROM public.components c
  WHERE c.is_active = true
  ORDER BY c.name;
END;
$function$


-- Function 10/21: get_components
CREATE OR REPLACE FUNCTION public.get_components(p_category text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_low_stock_only boolean DEFAULT false, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, sku text, name text, description text, category text, unit text, current_stock numeric, min_stock numeric, max_stock numeric, cost_per_unit numeric, supplier text, supplier_sku text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.sku, c.name, c.description, c.category, c.unit,
    c.current_stock, c.min_stock, c.max_stock, c.cost_per_unit,
    c.supplier, c.supplier_sku, c.is_active, c.created_at, c.updated_at
  FROM public.components c
  WHERE (p_category IS NULL OR c.category = p_category)
    AND (p_is_active IS NULL OR c.is_active = p_is_active)
    AND (p_low_stock_only = false OR c.current_stock < c.min_stock)
    AND (p_search IS NULL OR 
         c.name ILIKE '%' || p_search || '%' OR 
         c.sku ILIKE '%' || p_search || '%')
  ORDER BY c.name
  LIMIT p_limit;
END;
$function$


-- Function 11/21: get_low_stock_components
CREATE OR REPLACE FUNCTION public.get_low_stock_components()
 RETURNS TABLE(id uuid, sku text, name text, current_stock numeric, min_stock numeric, stock_deficit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.sku,
    c.name,
    c.current_stock,
    c.min_stock,
    (c.min_stock - c.current_stock) as stock_deficit
  FROM public.components c
  WHERE c.is_active = true 
    AND c.current_stock < c.min_stock
  ORDER BY (c.min_stock - c.current_stock) DESC;
END;
$function$


-- Function 12/21: get_product_requirements
CREATE OR REPLACE FUNCTION public.get_product_requirements(p_shopify_product_id text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, shopify_product_id text, shopify_variant_id text, product_title text, component_id uuid, component_name text, component_sku text, quantity_per_unit numeric, current_stock numeric, is_optional boolean, auto_deduct boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.shopify_product_id,
    pr.shopify_variant_id,
    pr.product_title,
    c.id as component_id,
    c.name as component_name,
    c.sku as component_sku,
    pr.quantity_per_unit,
    c.current_stock,
    pr.is_optional,
    pr.auto_deduct,
    pr.created_at
  FROM public.product_requirements pr
  JOIN public.components c ON pr.component_id = c.id
  WHERE (p_shopify_product_id IS NULL OR pr.shopify_product_id = p_shopify_product_id)
    AND (p_search IS NULL OR 
         pr.product_title ILIKE '%' || p_search || '%' OR 
         c.name ILIKE '%' || p_search || '%')
  ORDER BY pr.product_title, c.name;
END;
$function$


-- Function 13/21: get_stock_transactions
CREATE OR REPLACE FUNCTION public.get_stock_transactions(p_component_id uuid DEFAULT NULL::uuid, p_order_id text DEFAULT NULL::text, p_transaction_type text DEFAULT NULL::text, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, component_id uuid, component_name text, component_sku text, transaction_type text, quantity_change numeric, quantity_before numeric, quantity_after numeric, reference_order_id text, reason text, performed_by uuid, performer_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.component_id,
    c.name as component_name,
    c.sku as component_sku,
    st.transaction_type,
    st.quantity_change,
    st.quantity_before,
    st.quantity_after,
    st.reference_order_id,
    st.reason,
    st.performed_by,
    s.full_name as performer_name,
    st.created_at
  FROM public.stock_transactions st
  JOIN public.components c ON st.component_id = c.id
  LEFT JOIN public.staff_shared s ON st.performed_by = s.user_id
  WHERE (p_component_id IS NULL OR st.component_id = p_component_id)
    AND (p_order_id IS NULL OR st.reference_order_id = p_order_id)
    AND (p_transaction_type IS NULL OR st.transaction_type = p_transaction_type)
  ORDER BY st.created_at DESC
  LIMIT p_limit;
END;
$function$


-- Function 14/21: record_component_txn
CREATE OR REPLACE FUNCTION public.record_component_txn(p_component_id uuid, p_qty_delta numeric, p_reason text, p_ref text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_txn_id uuid;
  v_onhand numeric;
begin
  -- Optional safety: prevent negative stock
  select coalesce(sum(qty_delta),0) into v_onhand
  from public.component_txns
  where component_id = p_component_id;

  if v_onhand + p_qty_delta < 0 then
    raise exception 'Insufficient stock for component % (onhand %, delta %)', p_component_id, v_onhand, p_qty_delta;
  end if;

  insert into public.component_txns (component_id, qty_delta, reason, ref)
  values (p_component_id, p_qty_delta, p_reason, p_ref)
  returning id into v_txn_id;

  return v_txn_id;
end $function$


-- Function 15/21: remove_bom_component
CREATE OR REPLACE FUNCTION public.remove_bom_component(p_bom_id uuid, p_component_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.bom_items
  WHERE bom_id = p_bom_id AND component_id = p_component_id;
  
  RETURN true;
END;
$function$


-- Function 16/21: restock_order
CREATE OR REPLACE FUNCTION public.restock_order(p_order_id text, p_store text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_restocked_count integer := 0;
  v_transaction record;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Find all deductions for this order and reverse them
  FOR v_transaction IN 
    SELECT component_id, ABS(quantity_change) as qty_to_restore
    FROM public.stock_transactions
    WHERE reference_order_id = p_order_id
      AND transaction_type = 'order_deduction'
  LOOP
    -- Add the stock back
    UPDATE public.components
    SET current_stock = current_stock + v_transaction.qty_to_restore,
        updated_at = now()
    WHERE id = v_transaction.component_id;
    
    -- Log the restock transaction
    INSERT INTO public.stock_transactions (
      component_id, transaction_type, quantity_change,
      quantity_before, quantity_after, reference_order_id,
      reason, performed_by
    )
    SELECT 
      v_transaction.component_id,
      'order_restock',
      v_transaction.qty_to_restore,
      current_stock - v_transaction.qty_to_restore,
      current_stock,
      p_order_id,
      'Order cancelled/returned - restocking components',
      v_user_id
    FROM public.components
    WHERE id = v_transaction.component_id;
    
    v_restocked_count := v_restocked_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'components_restocked', v_restocked_count
  );
END;
$function$


-- Function 17/21: update_component_stock
CREATE OR REPLACE FUNCTION public.update_component_stock(p_component_id uuid, p_delta numeric, p_reason text, p_order_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old_stock numeric;
  v_new_stock numeric;
  v_user_id uuid;
  v_component_name text;
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
  
  -- Log the transaction using the correct audit_log structure
  INSERT INTO public.audit_log (
    action,
    performed_by,
    source,
    meta
  ) VALUES (
    'update_stock',
    v_user_id,  -- This will be NULL if no user is authenticated
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
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'component_id', p_component_id,
    'old_stock', v_old_stock,
    'new_stock', v_new_stock,
    'delta', p_delta
  );
END;
$function$


-- Function 18/21: upsert_accessory_keyword
CREATE OR REPLACE FUNCTION public.upsert_accessory_keyword(p_keyword text, p_component_id uuid, p_id uuid DEFAULT NULL::uuid, p_priority integer DEFAULT 0, p_match_type text DEFAULT 'contains'::text, p_is_active boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_keyword_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    -- Update existing keyword
    UPDATE public.accessory_keywords
    SET keyword = p_keyword,
        component_id = p_component_id,
        priority = p_priority,
        match_type = p_match_type,
        is_active = p_is_active,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_keyword_id;
  ELSE
    -- Create new keyword
    INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active)
    VALUES (p_keyword, p_component_id, p_priority, p_match_type, p_is_active)
    RETURNING id INTO v_keyword_id;
  END IF;
  
  RETURN v_keyword_id;
END;
$function$


-- Function 19/21: upsert_bom
CREATE OR REPLACE FUNCTION public.upsert_bom(p_product_title text, p_store text, p_bom_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_shopify_product_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_bom_id uuid;
BEGIN
  IF p_bom_id IS NOT NULL THEN
    -- Update existing BOM
    UPDATE public.boms
    SET product_title = p_product_title,
        store = p_store,
        description = p_description,
        shopify_product_id = p_shopify_product_id,
        updated_at = now()
    WHERE id = p_bom_id
    RETURNING id INTO v_bom_id;
  ELSE
    -- Create new BOM
    INSERT INTO public.boms (product_title, store, description, shopify_product_id)
    VALUES (p_product_title, p_store, p_description, p_shopify_product_id)
    RETURNING id INTO v_bom_id;
  END IF;
  
  RETURN v_bom_id;
END;
$function$


-- Function 20/21: upsert_component
CREATE OR REPLACE FUNCTION public.upsert_component(p_sku text, p_name text, p_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_unit text DEFAULT 'each'::text, p_current_stock numeric DEFAULT 0, p_min_stock numeric DEFAULT 0, p_max_stock numeric DEFAULT NULL::numeric, p_cost_per_unit numeric DEFAULT NULL::numeric, p_supplier text DEFAULT NULL::text, p_supplier_sku text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_component_id uuid;
  v_user_id uuid;
BEGIN
  -- Get user ID for audit log (only if user is authenticated)
  v_user_id := auth.uid();

  -- Upsert component (without is_active column since it doesn't exist in the table)
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

  -- Log the action (only if we have a valid user ID)
  IF v_user_id IS NOT NULL THEN
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

  RETURN v_component_id;
END;
$function$


-- Function 21/21: upsert_product_requirement
CREATE OR REPLACE FUNCTION public.upsert_product_requirement(p_shopify_product_id text, p_shopify_variant_id text, p_product_title text, p_component_id uuid, p_quantity_per_unit numeric, p_id uuid DEFAULT NULL::uuid, p_is_optional boolean DEFAULT false, p_auto_deduct boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_req_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.product_requirements
    SET shopify_product_id = p_shopify_product_id,
        shopify_variant_id = p_shopify_variant_id,
        product_title = p_product_title,
        component_id = p_component_id,
        quantity_per_unit = p_quantity_per_unit,
        is_optional = p_is_optional,
        auto_deduct = p_auto_deduct,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_req_id;
  ELSE
    -- Create new
    INSERT INTO public.product_requirements (
      shopify_product_id, shopify_variant_id, product_title,
      component_id, quantity_per_unit, is_optional, auto_deduct
    )
    VALUES (
      p_shopify_product_id, p_shopify_variant_id, p_product_title,
      p_component_id, p_quantity_per_unit, p_is_optional, p_auto_deduct
    )
    RETURNING id INTO v_req_id;
  END IF;
  
  RETURN v_req_id;
END;
$function$


