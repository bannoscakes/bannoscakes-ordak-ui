-- Migration: Simplified Inventory System
-- Date: 2025-12-06
-- Purpose: Replace overcomplicated dual-inventory system with simple, unified approach
--
-- Tables:
--   - components: All inventory items (shared across stores)
--   - boms: Bill of Materials per product/store
--   - bom_items: Components in each BOM
--   - accessories: Shopify-synced items (toppers, balloons, candles)
--   - stock_transactions: Audit log for all stock changes

-- ============================================================================
-- PHASE 1: DROP OLD FUNCTIONS (handles overloaded versions)
-- ============================================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Drop all versions of inventory-related functions
  FOR func_record IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'add_bom_component',
      'add_product_requirement',
      'deduct_inventory_for_order',
      'get_accessory_keywords',
      'get_bom_details',
      'get_boms',
      'get_component_transactions',
      'get_components',
      'get_low_stock_components',
      'get_product_requirements',
      'get_stock_transactions',
      'record_component_txn',
      'remove_bom_component',
      'restock_order',
      'tx_component_adjust',
      'tx_component_consume',
      'tx_component_receive',
      'tx_component_release',
      'tx_component_reserve',
      'update_component_stock',
      'upsert_accessory_keyword',
      'upsert_bom',
      'upsert_component',
      'upsert_product_requirement',
      'get_accessories',
      'get_accessories_needing_sync',
      'upsert_accessory',
      'adjust_accessory_stock',
      'adjust_component_stock',
      'delete_component',
      'delete_bom',
      'get_bom_by_product',
      'save_bom_items',
      'deduct_for_order'
    )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
  END LOOP;
END;
$$;

-- ============================================================================
-- PHASE 2: DROP UNUSED TABLES
-- ============================================================================

-- Tables no longer needed in simplified system
DROP TABLE IF EXISTS public.component_txns CASCADE;
DROP TABLE IF EXISTS public.product_requirements CASCADE;
DROP TABLE IF EXISTS public.accessory_keywords CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

-- ============================================================================
-- PHASE 3: MODIFY EXISTING TABLES
-- ============================================================================

-- Components: Add missing columns
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text;

-- Update current_stock and min_stock to integer if they exist and are numeric
-- (simpler, we don't need decimal stock counts)
DO $$
BEGIN
  -- Only alter current_stock if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'components'
    AND column_name = 'current_stock'
  ) THEN
    ALTER TABLE public.components
      ALTER COLUMN current_stock TYPE integer USING current_stock::integer;
  END IF;

  -- Only alter min_stock if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'components'
    AND column_name = 'min_stock'
  ) THEN
    ALTER TABLE public.components
      ALTER COLUMN min_stock TYPE integer USING min_stock::integer;
  END IF;
END;
$$;

-- BOMs: Add is_active column, update store constraint for 'both'
ALTER TABLE public.boms
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Drop old store constraint if exists, add new one allowing 'both'
ALTER TABLE public.boms DROP CONSTRAINT IF EXISTS boms_store_check;
ALTER TABLE public.boms
  ADD CONSTRAINT boms_store_check CHECK (store IN ('bannos', 'flourlane', 'both'));

-- BOM Items: Add stage column, make simpler
ALTER TABLE public.bom_items
  ADD COLUMN IF NOT EXISTS stage text;

ALTER TABLE public.bom_items DROP CONSTRAINT IF EXISTS bom_items_stage_check;
ALTER TABLE public.bom_items
  ADD CONSTRAINT bom_items_stage_check CHECK (stage IS NULL OR stage IN ('Filling', 'Decorating', 'Packing'));

-- Update quantity_required to numeric(10,3) for precision
ALTER TABLE public.bom_items
  ALTER COLUMN quantity_required TYPE numeric(10,3);

-- Stock transactions: Make more generic for both components and accessories
ALTER TABLE public.stock_transactions
  ADD COLUMN IF NOT EXISTS table_name text NOT NULL DEFAULT 'components',
  ADD COLUMN IF NOT EXISTS stock_before integer,
  ADD COLUMN IF NOT EXISTS stock_after integer,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS item_id uuid,
  ADD COLUMN IF NOT EXISTS change_amount integer,
  ADD COLUMN IF NOT EXISTS reference text;

-- Copy data from old columns to new columns if they exist, then drop old columns
DO $$
BEGIN
  -- component_id -> item_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_transactions' AND column_name = 'component_id') THEN
    UPDATE public.stock_transactions SET item_id = component_id WHERE item_id IS NULL;
    ALTER TABLE public.stock_transactions DROP COLUMN component_id;
  END IF;

  -- qty_delta -> change_amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_transactions' AND column_name = 'qty_delta') THEN
    UPDATE public.stock_transactions SET change_amount = qty_delta::integer WHERE change_amount IS NULL;
    ALTER TABLE public.stock_transactions DROP COLUMN qty_delta;
  END IF;

  -- ref -> reference
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_transactions' AND column_name = 'ref') THEN
    UPDATE public.stock_transactions SET reference = ref WHERE reference IS NULL;
    ALTER TABLE public.stock_transactions DROP COLUMN ref;
  END IF;
END;
$$;

-- ============================================================================
-- PHASE 4: CREATE NEW TABLES
-- ============================================================================

-- Accessories table: For Shopify-synced items
CREATE TABLE IF NOT EXISTS public.accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('topper', 'balloon', 'candle', 'other')),
  product_match text NOT NULL,  -- Keyword to match Shopify product titles
  current_stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for product matching
CREATE INDEX IF NOT EXISTS idx_accessories_product_match ON public.accessories(product_match);
CREATE INDEX IF NOT EXISTS idx_accessories_stock ON public.accessories(current_stock) WHERE is_active = true;

-- ============================================================================
-- PHASE 5: RLS POLICIES
-- ============================================================================

-- Enable RLS on new table
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

-- Accessories: Read access for authenticated users
DROP POLICY IF EXISTS "accessories_select" ON public.accessories;
CREATE POLICY "accessories_select" ON public.accessories
  FOR SELECT TO authenticated
  USING (true);

-- Accessories: Full access for Admin role
DROP POLICY IF EXISTS "accessories_admin_all" ON public.accessories;
CREATE POLICY "accessories_admin_all" ON public.accessories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_shared
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- ============================================================================
-- PHASE 6: SIMPLIFIED FUNCTIONS
-- ============================================================================

-- ===================
-- COMPONENTS FUNCTIONS
-- ===================

-- Get all components with optional filters
CREATE OR REPLACE FUNCTION public.get_components(
  p_category text DEFAULT NULL,
  p_active_only boolean DEFAULT true,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  description text,
  category text,
  current_stock integer,
  min_stock integer,
  unit text,
  is_active boolean,
  is_low_stock boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.sku,
    c.name,
    c.description,
    c.category,
    c.current_stock,
    c.min_stock,
    c.unit,
    c.is_active,
    (c.current_stock < c.min_stock) AS is_low_stock,
    c.created_at,
    c.updated_at
  FROM public.components c
  WHERE
    (p_category IS NULL OR c.category = p_category)
    AND (NOT p_active_only OR c.is_active = true)
    AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.sku ILIKE '%' || p_search || '%')
  ORDER BY c.name;
END;
$$;

-- Get low stock components
CREATE OR REPLACE FUNCTION public.get_low_stock_components()
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  category text,
  current_stock integer,
  min_stock integer,
  shortage integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.sku,
    c.name,
    c.category,
    c.current_stock,
    c.min_stock,
    (c.min_stock - c.current_stock) AS shortage
  FROM public.components c
  WHERE c.is_active = true AND c.current_stock < c.min_stock
  ORDER BY (c.min_stock - c.current_stock) DESC;
END;
$$;

-- Upsert component
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
    -- Update existing
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
  ELSE
    -- Insert new
    INSERT INTO public.components (sku, name, description, category, min_stock, unit, is_active)
    VALUES (p_sku, p_name, p_description, p_category, p_min_stock, p_unit, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Adjust component stock with logging
CREATE OR REPLACE FUNCTION public.adjust_component_stock(
  p_component_id uuid,
  p_change integer,
  p_reason text,
  p_reference text DEFAULT NULL,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_before integer;
  v_after integer;
  v_component_name text;
BEGIN
  -- Get current stock
  SELECT current_stock, name INTO v_before, v_component_name
  FROM public.components
  WHERE id = p_component_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Component not found');
  END IF;

  v_after := v_before + p_change;

  -- Prevent negative stock (optional: could make this configurable)
  IF v_after < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock. Current: ' || v_before || ', Requested: ' || (-p_change)
    );
  END IF;

  -- Update stock
  UPDATE public.components
  SET current_stock = v_after, updated_at = now()
  WHERE id = p_component_id;

  -- Log transaction
  INSERT INTO public.stock_transactions (
    table_name, item_id, change_amount, stock_before, stock_after, reason, reference, created_by
  ) VALUES (
    'components', p_component_id, p_change, v_before, v_after, p_reason, p_reference, p_created_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'component', v_component_name,
    'before', v_before,
    'after', v_after,
    'change', p_change
  );
END;
$$;

-- Delete (soft) component
CREATE OR REPLACE FUNCTION public.delete_component(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.components SET is_active = false, updated_at = now() WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- ===================
-- BOMS FUNCTIONS
-- ===================

-- Get BOMs with items
CREATE OR REPLACE FUNCTION public.get_boms(
  p_store text DEFAULT NULL,
  p_active_only boolean DEFAULT true,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  product_title text,
  store text,
  description text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
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
    b.is_active,
    b.created_at,
    b.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', bi.id,
            'component_id', bi.component_id,
            'component_name', c.name,
            'component_sku', c.sku,
            'quantity_required', bi.quantity_required,
            'stage', bi.stage
          )
          ORDER BY c.name
        )
        FROM public.bom_items bi
        JOIN public.components c ON c.id = bi.component_id
        WHERE bi.bom_id = b.id
      ),
      '[]'::jsonb
    ) AS items
  FROM public.boms b
  WHERE
    (p_store IS NULL OR b.store = p_store OR b.store = 'both')
    AND (NOT p_active_only OR b.is_active = true)
    AND (p_search IS NULL OR b.product_title ILIKE '%' || p_search || '%')
  ORDER BY b.product_title;
END;
$$;

-- Get BOM by product title (for order deduction)
CREATE OR REPLACE FUNCTION public.get_bom_by_product(
  p_product_title text,
  p_store text
)
RETURNS TABLE (
  bom_id uuid,
  component_id uuid,
  component_name text,
  quantity_required numeric(10,3),
  stage text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS bom_id,
    bi.component_id,
    c.name AS component_name,
    bi.quantity_required,
    bi.stage
  FROM public.boms b
  JOIN public.bom_items bi ON bi.bom_id = b.id
  JOIN public.components c ON c.id = bi.component_id
  WHERE
    b.product_title ILIKE '%' || p_product_title || '%'
    AND (b.store = p_store OR b.store = 'both')
    AND b.is_active = true
    AND c.is_active = true
  ORDER BY c.name;
END;
$$;

-- Upsert BOM (header only)
CREATE OR REPLACE FUNCTION public.upsert_bom(
  p_id uuid DEFAULT NULL,
  p_product_title text DEFAULT NULL,
  p_store text DEFAULT 'both',
  p_description text DEFAULT NULL,
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
    -- Update existing
    UPDATE public.boms SET
      product_title = COALESCE(p_product_title, product_title),
      store = COALESCE(p_store, store),
      description = p_description,
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    -- Insert new
    INSERT INTO public.boms (product_title, store, description, is_active)
    VALUES (p_product_title, p_store, p_description, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Save BOM items (replace all items for a BOM)
CREATE OR REPLACE FUNCTION public.save_bom_items(
  p_bom_id uuid,
  p_items jsonb  -- Array of {component_id, quantity_required, stage}
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_count integer := 0;
BEGIN
  -- Delete existing items
  DELETE FROM public.bom_items WHERE bom_id = p_bom_id;

  -- Insert new items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.bom_items (bom_id, component_id, quantity_required, stage)
    VALUES (
      p_bom_id,
      (v_item->>'component_id')::uuid,
      (v_item->>'quantity_required')::numeric(10,3),
      v_item->>'stage'
    );
    v_count := v_count + 1;
  END LOOP;

  -- Update BOM timestamp
  UPDATE public.boms SET updated_at = now() WHERE id = p_bom_id;

  RETURN v_count;
END;
$$;

-- Delete BOM (soft delete)
CREATE OR REPLACE FUNCTION public.delete_bom(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.boms SET is_active = false, updated_at = now() WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- ===================
-- ORDER DEDUCTION
-- ===================

-- Deduct stock when order is complete
CREATE OR REPLACE FUNCTION public.deduct_for_order(
  p_order_id text,
  p_product_title text,
  p_store text,
  p_quantity integer DEFAULT 1,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bom_id uuid;
  v_item RECORD;
  v_deductions jsonb := '[]'::jsonb;
  v_before integer;
  v_after integer;
  v_deduct_qty integer;
BEGIN
  -- Find matching BOM
  SELECT b.id INTO v_bom_id
  FROM public.boms b
  WHERE
    b.product_title ILIKE '%' || p_product_title || '%'
    AND (b.store = p_store OR b.store = 'both')
    AND b.is_active = true
  LIMIT 1;

  IF v_bom_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No matching BOM found for product: ' || p_product_title
    );
  END IF;

  -- Deduct each component
  FOR v_item IN
    SELECT bi.component_id, c.name, bi.quantity_required
    FROM public.bom_items bi
    JOIN public.components c ON c.id = bi.component_id
    WHERE bi.bom_id = v_bom_id AND c.is_active = true
  LOOP
    v_deduct_qty := (v_item.quantity_required * p_quantity)::integer;

    -- Get current stock
    SELECT current_stock INTO v_before FROM public.components WHERE id = v_item.component_id;
    v_after := GREATEST(0, v_before - v_deduct_qty);

    -- Update stock
    UPDATE public.components
    SET current_stock = v_after, updated_at = now()
    WHERE id = v_item.component_id;

    -- Log transaction
    INSERT INTO public.stock_transactions (
      table_name, item_id, change_amount, stock_before, stock_after, reason, reference, created_by
    ) VALUES (
      'components', v_item.component_id, -v_deduct_qty, v_before, v_after,
      'order_complete', p_order_id, p_created_by
    );

    -- Track what was deducted
    v_deductions := v_deductions || jsonb_build_object(
      'component', v_item.name,
      'deducted', v_deduct_qty,
      'before', v_before,
      'after', v_after
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'bom_id', v_bom_id,
    'order_id', p_order_id,
    'quantity', p_quantity,
    'deductions', v_deductions
  );
END;
$$;

-- ===================
-- ACCESSORIES FUNCTIONS
-- ===================

-- Get all accessories
CREATE OR REPLACE FUNCTION public.get_accessories(
  p_category text DEFAULT NULL,
  p_active_only boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  category text,
  product_match text,
  current_stock integer,
  min_stock integer,
  is_active boolean,
  is_low_stock boolean,
  is_out_of_stock boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.sku,
    a.name,
    a.category,
    a.product_match,
    a.current_stock,
    a.min_stock,
    a.is_active,
    (a.current_stock < a.min_stock AND a.current_stock > 0) AS is_low_stock,
    (a.current_stock = 0) AS is_out_of_stock,
    a.created_at,
    a.updated_at
  FROM public.accessories a
  WHERE
    (p_category IS NULL OR a.category = p_category)
    AND (NOT p_active_only OR a.is_active = true)
  ORDER BY a.name;
END;
$$;

-- Get accessories needing Shopify sync (out of stock)
CREATE OR REPLACE FUNCTION public.get_accessories_needing_sync()
RETURNS TABLE (
  id uuid,
  name text,
  product_match text,
  current_stock integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name, a.product_match, a.current_stock
  FROM public.accessories a
  WHERE a.is_active = true AND a.current_stock = 0
  ORDER BY a.name;
END;
$$;

-- Upsert accessory
CREATE OR REPLACE FUNCTION public.upsert_accessory(
  p_id uuid DEFAULT NULL,
  p_sku text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_category text DEFAULT 'other',
  p_product_match text DEFAULT NULL,
  p_min_stock integer DEFAULT 5,
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
    -- Update existing
    UPDATE public.accessories SET
      sku = COALESCE(p_sku, sku),
      name = COALESCE(p_name, name),
      category = COALESCE(p_category, category),
      product_match = COALESCE(p_product_match, product_match),
      min_stock = COALESCE(p_min_stock, min_stock),
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    -- Insert new
    INSERT INTO public.accessories (sku, name, category, product_match, min_stock, is_active)
    VALUES (p_sku, p_name, p_category, p_product_match, p_min_stock, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Adjust accessory stock with logging
CREATE OR REPLACE FUNCTION public.adjust_accessory_stock(
  p_accessory_id uuid,
  p_change integer,
  p_reason text,
  p_reference text DEFAULT NULL,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_before integer;
  v_after integer;
  v_accessory_name text;
BEGIN
  -- Get current stock
  SELECT current_stock, name INTO v_before, v_accessory_name
  FROM public.accessories
  WHERE id = p_accessory_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accessory not found');
  END IF;

  v_after := GREATEST(0, v_before + p_change);

  -- Update stock
  UPDATE public.accessories
  SET current_stock = v_after, updated_at = now()
  WHERE id = p_accessory_id;

  -- Log transaction
  INSERT INTO public.stock_transactions (
    table_name, item_id, change_amount, stock_before, stock_after, reason, reference, created_by
  ) VALUES (
    'accessories', p_accessory_id, p_change, v_before, v_after, p_reason, p_reference, p_created_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'accessory', v_accessory_name,
    'before', v_before,
    'after', v_after,
    'change', p_change,
    'needs_sync', (v_after = 0)
  );
END;
$$;

-- ===================
-- STOCK TRANSACTIONS (AUDIT LOG)
-- ===================

-- Get stock transactions
CREATE OR REPLACE FUNCTION public.get_stock_transactions(
  p_table_name text DEFAULT NULL,
  p_item_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  table_name text,
  item_id uuid,
  item_name text,
  change_amount integer,
  stock_before integer,
  stock_after integer,
  reason text,
  reference text,
  created_by text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.table_name,
    st.item_id,
    CASE
      WHEN st.table_name = 'components' THEN c.name
      WHEN st.table_name = 'accessories' THEN a.name
      ELSE 'Unknown'
    END AS item_name,
    st.change_amount::integer,
    st.stock_before,
    st.stock_after,
    st.reason,
    st.reference,
    st.created_by,
    st.created_at
  FROM public.stock_transactions st
  LEFT JOIN public.components c ON st.table_name = 'components' AND c.id = st.item_id
  LEFT JOIN public.accessories a ON st.table_name = 'accessories' AND a.id = st.item_id
  WHERE
    (p_table_name IS NULL OR st.table_name = p_table_name)
    AND (p_item_id IS NULL OR st.item_id = p_item_id)
  ORDER BY st.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- PHASE 7: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_components TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_low_stock_components TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_component TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_component_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_component TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_boms TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bom_by_product TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_bom TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_bom_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_bom TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_for_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessories TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessories_needing_sync TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_accessory TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_accessory_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_transactions TO authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
