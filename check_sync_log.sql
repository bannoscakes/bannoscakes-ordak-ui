-- Check recent Shopify sync runs to see what failed
SELECT 
  id,
  store,
  sync_type,
  status,
  started_at,
  completed_at,
  orders_imported,
  orders_skipped,
  errors,
  error_message,
  metadata
FROM shopify_sync_runs
WHERE store = 'bannos'
ORDER BY started_at DESC
LIMIT 5;

