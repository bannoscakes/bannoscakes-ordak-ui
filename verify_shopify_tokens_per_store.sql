-- Verify Shopify tokens are stored separately per store
-- Run this in Supabase SQL Editor or psql

-- Show all shopifyToken entries (should show separate rows per store)
SELECT 
  store,
  key,
  LEFT(value::text, 30) as token_preview,
  created_at
FROM settings
WHERE key = 'shopifyToken'
ORDER BY store;

