-- Migration: Fix sync_shopify_orders Foreign Key Violation
-- Purpose: Remove audit_log insert that causes performed_by FK violation

BEGIN;

-- ============================================================================
-- Fix sync_shopify_orders RPC - Remove audit_log insert
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
  
  -- REMOVED: audit_log insert (causes FK violation)
  -- sync_runs table already tracks this operation
  
  -- Note: Edge Function will fetch orders and update run status
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'message', 'Order sync started',
    'stub', false
  );
END;
$function$;

COMMENT ON FUNCTION public.sync_shopify_orders IS 'Trigger manual order sync from Shopify Admin API. Tracked in shopify_sync_runs.';

COMMIT;

