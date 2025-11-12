-- Check error details from failed sync runs
SELECT 
  id,
  store,
  sync_type,
  status,
  started_at,
  error_message,
  metadata
FROM shopify_sync_runs
WHERE store = 'bannos'
  AND status = 'error'
ORDER BY started_at DESC
LIMIT 3;

