-- Verify Shopify Order Sync Actually Worked
-- Run these queries to check if orders were imported

-- ============================================================================
-- Step 1: Check sync run details (what happened during sync)
-- ============================================================================

SELECT 
  store,
  sync_type,
  status,
  started_at,
  completed_at,
  orders_imported,
  orders_skipped,
  errors,
  metadata
FROM shopify_sync_runs
WHERE store IN ('bannos', 'flourlane')
  AND sync_type = 'sync_orders'
ORDER BY started_at DESC
LIMIT 5;

-- Expected result:
-- If orders were found: orders_imported > 0
-- If no orders: orders_skipped > 0 (with reasons in metadata)
-- If errors: errors > 0 (with error_message)


-- ============================================================================
-- Step 2: Check webhook_inbox for newly imported orders
-- ============================================================================

-- Bannos orders from manual sync
SELECT 
  id,
  processed,
  payload->>'name' as order_number,
  payload->>'createdAt' as created_at
FROM webhook_inbox_bannos
WHERE processed = false
ORDER BY id DESC
LIMIT 5;

-- Flourlane orders from manual sync
SELECT 
  id,
  processed,
  payload->>'name' as order_number,
  payload->>'createdAt' as created_at
FROM webhook_inbox_flourlane
WHERE processed = false
ORDER BY id DESC
LIMIT 5;

-- Expected result:
-- If sync imported orders: You'll see new rows with processed = false
-- If no orders to import: Empty result (no unfulfilled orders in Shopify)


-- ============================================================================
-- Step 3: Count total orders in inbox (to see if anything was added)
-- ============================================================================

SELECT 
  'bannos' as store,
  COUNT(*) as total_in_inbox,
  COUNT(*) FILTER (WHERE processed = false) as unprocessed
FROM webhook_inbox_bannos

UNION ALL

SELECT 
  'flourlane' as store,
  COUNT(*) as total_in_inbox,
  COUNT(*) FILTER (WHERE processed = false) as unprocessed
FROM webhook_inbox_flourlane;

-- This shows how many orders are waiting to be processed

