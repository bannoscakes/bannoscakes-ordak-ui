-- 014_complete_inventory_system.sql
-- Complete Inventory Management System
-- BOMs, Accessory Keywords, Product Requirements, Stock Transactions
-- Shared inventory across Bannos and Flourlane stores

-- =============================================
-- TABLES
-- =============================================

-- BOMs (Bill of Materials) - Product recipes
CREATE TABLE IF NOT EXISTS public.boms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_title text NOT NULL,
  store text CHECK (store IN ('bannos', 'flourlane', 'both')) DEFAULT 'both',
  description text,
  shopify_product_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_title, store)
);

-- BOM Items - Components needed for each product
CREATE TABLE IF NOT EXISTS public.bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL REFERENCES public.boms(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  quantity_required numeric(10,2) NOT NULL CHECK (quantity_required > 0),
  unit text NOT NULL DEFAULT 'each',
  notes text,
  is_optional boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bom_id, component_id)
);

-- Accessory Keywords - Keyword matching for accessories
CREATE TABLE IF NOT EXISTS public.accessory_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  priority integer DEFAULT 0,
  match_type text CHECK (match_type IN ('exact', 'contains', 'starts_with')) DEFAULT 'contains',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast keyword lookups
CREATE INDEX IF NOT EXISTS idx_accessory_keywords_keyword ON public.accessory_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_accessory_keywords_component ON public.accessory_keywords(component_id);
CREATE INDEX IF NOT EXISTS idx_accessory_keywords_active ON public.accessory_keywords(is_active) WHERE is_active = true;

-- Product Requirements - Links Shopify products to required components
CREATE TABLE IF NOT EXISTS public.product_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id text,
  shopify_variant_id text,
  product_title text NOT NULL,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  quantity_per_unit numeric(10,2) NOT NULL CHECK (quantity_per_unit > 0),
  is_optional boolean DEFAULT false,
  auto_deduct boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock Transactions - Detailed transaction history
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'adjustment', 'deduction', 'restock', 'order_deduction', 'order_restock')),
  quantity_change numeric(10,2) NOT NULL,
  quantity_before numeric(10,2) NOT NULL,
  quantity_after numeric(10,2) NOT NULL,
  reference_order_id text,
  reason text,
  performed_by uuid REFERENCES public.staff_shared(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_boms_store ON public.boms(store);
CREATE INDEX IF NOT EXISTS idx_boms_active ON public.boms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_boms_product_title ON public.boms(product_title);

CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON public.bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_component ON public.bom_items(component_id);

CREATE INDEX IF NOT EXISTS idx_product_requirements_shopify ON public.product_requirements(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_product_requirements_component ON public.product_requirements(component_id);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_component ON public.stock_transactions(component_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_order ON public.stock_transactions(reference_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created ON public.stock_transactions(created_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS trg_boms_updated ON public.boms;
CREATE TRIGGER trg_boms_updated
  BEFORE UPDATE ON public.boms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_accessory_keywords_updated ON public.accessory_keywords;
CREATE TRIGGER trg_accessory_keywords_updated
  BEFORE UPDATE ON public.accessory_keywords
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_requirements_updated ON public.product_requirements;
CREATE TRIGGER trg_product_requirements_updated
  BEFORE UPDATE ON public.product_requirements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessory_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- BOMs - All authenticated users can view, Admin can modify
DROP POLICY IF EXISTS "All can view boms" ON public.boms;
CREATE POLICY "All can view boms" ON public.boms FOR SELECT USING (true);

DROP POLICY IF EXISTS "All can view bom items" ON public.bom_items;
CREATE POLICY "All can view bom items" ON public.bom_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "All can view keywords" ON public.accessory_keywords;
CREATE POLICY "All can view keywords" ON public.accessory_keywords FOR SELECT USING (true);

DROP POLICY IF EXISTS "All can view requirements" ON public.product_requirements;
CREATE POLICY "All can view requirements" ON public.product_requirements FOR SELECT USING (true);

DROP POLICY IF EXISTS "All can view transactions" ON public.stock_transactions;
CREATE POLICY "All can view transactions" ON public.stock_transactions FOR SELECT USING (true);

-- =============================================
-- RPCs - BOM MANAGEMENT
-- =============================================

-- Get all BOMs with component counts
CREATE OR REPLACE FUNCTION public.get_boms(
  p_store text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  product_title text,
  store text,
  description text,
  shopify_product_id text,
  is_active boolean,
  component_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  WHERE (p_store IS NULL OR b.store = p_store OR b.store = 'both')
    AND (p_is_active IS NULL OR b.is_active = p_is_active)
    AND (p_search IS NULL OR b.product_title ILIKE '%' || p_search || '%')
  GROUP BY b.id
  ORDER BY b.product_title;
END;
$$;

-- Get BOM details with all components
CREATE OR REPLACE FUNCTION public.get_bom_details(
  p_bom_id uuid
)
RETURNS TABLE (
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
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create or update BOM
CREATE OR REPLACE FUNCTION public.upsert_bom(
  p_product_title text,
  p_store text,
  p_bom_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_shopify_product_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Add component to BOM
CREATE OR REPLACE FUNCTION public.add_bom_component(
  p_bom_id uuid,
  p_component_id uuid,
  p_quantity_required numeric,
  p_unit text DEFAULT 'each',
  p_is_optional boolean DEFAULT false,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Remove component from BOM
CREATE OR REPLACE FUNCTION public.remove_bom_component(
  p_bom_id uuid,
  p_component_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.bom_items
  WHERE bom_id = p_bom_id AND component_id = p_component_id;
  
  RETURN true;
END;
$$;

-- =============================================
-- RPCs - ACCESSORY KEYWORDS
-- =============================================

-- Get all accessory keywords
CREATE OR REPLACE FUNCTION public.get_accessory_keywords(
  p_search text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  keyword text,
  component_id uuid,
  component_name text,
  component_sku text,
  priority integer,
  match_type text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Find component by keyword
CREATE OR REPLACE FUNCTION public.find_component_by_keyword(
  p_keyword text
)
RETURNS TABLE (
  component_id uuid,
  component_name text,
  component_sku text,
  current_stock numeric,
  keyword_matched text,
  match_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Upsert accessory keyword
CREATE OR REPLACE FUNCTION public.upsert_accessory_keyword(
  p_keyword text,
  p_component_id uuid,
  p_id uuid DEFAULT NULL,
  p_priority integer DEFAULT 0,
  p_match_type text DEFAULT 'contains',
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Delete accessory keyword
CREATE OR REPLACE FUNCTION public.delete_accessory_keyword(
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.accessory_keywords WHERE id = p_id;
  RETURN true;
END;
$$;

-- =============================================
-- RPCs - PRODUCT REQUIREMENTS
-- =============================================

-- Get product requirements
CREATE OR REPLACE FUNCTION public.get_product_requirements(
  p_shopify_product_id text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  shopify_product_id text,
  shopify_variant_id text,
  product_title text,
  component_id uuid,
  component_name text,
  component_sku text,
  quantity_per_unit numeric,
  current_stock numeric,
  is_optional boolean,
  auto_deduct boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Add product requirement
CREATE OR REPLACE FUNCTION public.add_product_requirement(
  p_shopify_product_id text,
  p_shopify_variant_id text,
  p_product_title text,
  p_component_id uuid,
  p_quantity_per_unit numeric,
  p_is_optional boolean DEFAULT false,
  p_auto_deduct boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- =============================================
-- RPCs - STOCK TRANSACTIONS
-- =============================================

-- Get stock transaction history
CREATE OR REPLACE FUNCTION public.get_stock_transactions(
  p_component_id uuid DEFAULT NULL,
  p_order_id text DEFAULT NULL,
  p_transaction_type text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  component_id uuid,
  component_name text,
  component_sku text,
  transaction_type text,
  quantity_change numeric,
  quantity_before numeric,
  quantity_after numeric,
  reference_order_id text,
  reason text,
  performed_by uuid,
  performer_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Restock order (reverse inventory deductions)
CREATE OR REPLACE FUNCTION public.restock_order(
  p_order_id text,
  p_store text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Deduct inventory for an order (based on BOM)
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order(
  p_order_id text,
  p_product_title text,
  p_store text,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Upsert product requirement
CREATE OR REPLACE FUNCTION public.upsert_product_requirement(
  p_shopify_product_id text,
  p_shopify_variant_id text,
  p_product_title text,
  p_component_id uuid,
  p_quantity_per_unit numeric,
  p_id uuid DEFAULT NULL,
  p_is_optional boolean DEFAULT false,
  p_auto_deduct boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- =============================================
-- GRANTS
-- =============================================

GRANT SELECT ON public.boms TO authenticated, anon;
GRANT SELECT ON public.bom_items TO authenticated, anon;
GRANT SELECT ON public.accessory_keywords TO authenticated, anon;
GRANT SELECT ON public.product_requirements TO authenticated, anon;
GRANT SELECT ON public.stock_transactions TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.get_boms(text, boolean, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_bom_details(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upsert_bom(text, text, uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.add_bom_component(uuid, uuid, numeric, text, boolean, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.remove_bom_component(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_accessory_keywords(text, boolean) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.find_component_by_keyword(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upsert_accessory_keyword(text, uuid, uuid, integer, text, boolean) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.delete_accessory_keyword(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_product_requirements(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upsert_product_requirement(text, text, text, uuid, numeric, uuid, boolean, boolean) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_transactions(uuid, text, text, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.restock_order(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_order(text, text, text, integer) TO authenticated, anon;

