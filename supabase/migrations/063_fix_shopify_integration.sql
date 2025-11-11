-- Migration: Fix Task 12 - Shopify Integration (Admin API, Order Sync Only)
-- Purpose: Correct API endpoints and remove unnecessary catalog sync

BEGIN;

-- ============================================================================
-- CLEANUP: Remove catalog sync (not needed - BOMs handle inventory)
-- ============================================================================

DROP FUNCTION IF EXISTS public.connect_catalog(text, text);

-- ============================================================================
-- CLEANUP: Remove old test function
-- ============================================================================

DROP FUNCTION IF EXISTS public.test_storefront_token(text, text);

-- ============================================================================
-- RPC 1: test_admin_token (Renamed from test_storefront_token)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_admin_token(
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
  
  -- Save token to settings (correct key: shopifyToken)
  INSERT INTO settings (store, key, value)
  VALUES (p_store, 'shopifyToken', to_jsonb(p_token))
  ON CONFLICT (store, key) DO UPDATE SET value = EXCLUDED.value;
  
  -- Create sync run record
  INSERT INTO shopify_sync_runs (store, sync_type, status)
  VALUES (p_store, 'test_token', 'running')
  RETURNING id INTO v_run_id;
  
  -- Note: Edge Function will test Admin API and update run status
  RETURN jsonb_build_object(
    'valid', true,
    'run_id', v_run_id,
    'message', 'Testing Admin API token...',
    'stub', false
  );
END;
$function$;

-- ============================================================================
-- RPC 2: sync_shopify_orders (Fixed to use correct token key)
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
  
  -- Get Admin token (correct key: shopifyToken)
  SELECT value #>> '{}' INTO v_token
  FROM settings
  WHERE store = p_store AND key = 'shopifyToken';
  
  IF v_token IS NULL OR trim(v_token) = '' THEN
    RAISE EXCEPTION 'Shopify Admin token not configured for store: %', p_store;
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
  
  -- Note: Edge Function will fetch orders and update run status
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'message', 'Order sync started',
    'stub', false
  );
END;
$function$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.test_admin_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_shopify_orders(text) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.test_admin_token IS 'Validate Shopify Admin API token. Uses same token as webhooks.';
COMMENT ON FUNCTION public.sync_shopify_orders IS 'Sync unfulfilled orders from Shopify Admin API. Filters by due date tags.';

COMMIT;

