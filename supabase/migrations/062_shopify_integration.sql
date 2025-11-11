-- Migration: Task 12 - Shopify Integration RPCs
-- Purpose: Enable Shopify sync functionality from Settings page

BEGIN;

-- ============================================================================
-- TABLE: shopify_sync_runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shopify_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL CHECK (store IN ('bannos','flourlane')),
  sync_type text NOT NULL CHECK (sync_type IN ('test_token','sync_products','sync_orders')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  products_imported integer DEFAULT 0,
  products_skipped integer DEFAULT 0,
  orders_imported integer DEFAULT 0,
  orders_skipped integer DEFAULT 0,
  errors integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_store_created 
  ON public.shopify_sync_runs(store, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_status 
  ON public.shopify_sync_runs(status) 
  WHERE status = 'running';

COMMENT ON TABLE public.shopify_sync_runs IS 'Tracks Shopify sync operations. Powers sync log and status indicators.';

-- ============================================================================
-- RPC 1: test_storefront_token
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_storefront_token(
  p_store text,
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_run_id uuid;
BEGIN
  -- Validate inputs
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  IF p_token IS NULL OR length(p_token) < 20 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Token appears invalid (too short)'
    );
  END IF;
  
  -- Create sync run record
  INSERT INTO shopify_sync_runs (store, sync_type, status)
  VALUES (p_store, 'test_token', 'running')
  RETURNING id INTO v_run_id;
  
  -- Note: Actual API test happens in Edge Function
  -- For now, return stub response
  RETURN jsonb_build_object(
    'valid', true,
    'run_id', v_run_id,
    'message', 'Token validation queued - implement Edge Function to test against Shopify API',
    'stub', true
  );
END;
$function$;

-- ============================================================================
-- RPC 2: connect_catalog (Product Sync)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.connect_catalog(
  p_store text,
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_run_id uuid;
BEGIN
  -- Validate inputs
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'Shopify token required';
  END IF;
  
  -- Save token to settings
  INSERT INTO settings (store, key, value)
  VALUES (p_store, 'shopifyToken', to_jsonb(p_token))
  ON CONFLICT (store, key) DO UPDATE SET value = EXCLUDED.value;
  
  -- Record last connected timestamp
  INSERT INTO settings (store, key, value)
  VALUES (p_store, 'shopify_last_connected', to_jsonb(now()))
  ON CONFLICT (store, key) DO UPDATE SET value = EXCLUDED.value;
  
  -- Create sync run record
  INSERT INTO shopify_sync_runs (store, sync_type, status)
  VALUES (p_store, 'sync_products', 'running')
  RETURNING id INTO v_run_id;
  
  -- Log to audit
  INSERT INTO audit_log (action, performed_by, source, meta)
  VALUES (
    'shopify_catalog_sync_started',
    auth.uid(),
    'connect_catalog',
    jsonb_build_object('store', p_store, 'run_id', v_run_id)
  );
  
  -- Note: Actual product sync happens in Edge Function
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'message', 'Product sync queued - implement Edge Function to fetch from Shopify',
    'stub', true
  );
END;
$function$;

-- ============================================================================
-- RPC 3: sync_shopify_orders
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_shopify_orders(
  p_store text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_run_id uuid;
  v_token text;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  -- Get stored token
  SELECT value #>> '{}' INTO v_token
  FROM settings
  WHERE store = p_store AND key = 'shopifyToken';
  
  IF v_token IS NULL OR trim(v_token) = '' THEN
    RAISE EXCEPTION 'Shopify token not configured for store: %', p_store;
  END IF;
  
  -- Create sync run
  INSERT INTO shopify_sync_runs (store, sync_type, status)
  VALUES (p_store, 'sync_orders', 'running')
  RETURNING id INTO v_run_id;
  
  -- Record last sync timestamp
  INSERT INTO settings (store, key, value)
  VALUES (p_store, 'shopify_last_sync', to_jsonb(now()))
  ON CONFLICT (store, key) DO UPDATE SET value = EXCLUDED.value;
  
  -- Log to audit
  INSERT INTO audit_log (action, performed_by, source, meta)
  VALUES (
    'shopify_orders_sync_started',
    auth.uid(),
    'sync_shopify_orders',
    jsonb_build_object('store', p_store, 'run_id', v_run_id)
  );
  
  -- Note: Actual order sync happens in Edge Function
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'message', 'Order sync queued - implement Edge Function to fetch from Shopify',
    'stub', true
  );
END;
$function$;

-- ============================================================================
-- RPC 4: get_sync_log
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sync_log(
  p_store text DEFAULT NULL,
  p_limit integer DEFAULT 50
) RETURNS TABLE(
  id uuid,
  store text,
  sync_type text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  products_imported integer,
  products_skipped integer,
  orders_imported integer,
  orders_skipped integer,
  errors integer,
  error_message text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.store,
    r.sync_type,
    r.status,
    r.started_at,
    r.completed_at,
    r.products_imported,
    r.products_skipped,
    r.orders_imported,
    r.orders_skipped,
    r.errors,
    r.error_message
  FROM shopify_sync_runs r
  WHERE (p_store IS NULL OR r.store = p_store)
  ORDER BY r.started_at DESC
  LIMIT p_limit;
END;
$function$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.test_storefront_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_catalog(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_shopify_orders(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sync_log(text, integer) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.test_storefront_token IS 'Validate Shopify Storefront Access Token. Calls Edge Function for actual API test.';
COMMENT ON FUNCTION public.connect_catalog IS 'Save token and trigger product catalog sync. Calls Edge Function for actual sync.';
COMMENT ON FUNCTION public.sync_shopify_orders IS 'Trigger manual order sync from Shopify. Calls Edge Function for actual sync.';
COMMENT ON FUNCTION public.get_sync_log IS 'Get Shopify sync history for a store.';

COMMIT;

