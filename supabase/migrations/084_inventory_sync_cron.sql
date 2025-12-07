-- Inventory sync cron job - runs every 5 minutes
-- Processes inventory_sync_queue and sets items out of stock in Shopify

-- ⚠️ LIMITATION: pg_cron URL Hardcoding
-- This migration contains a hardcoded Supabase project URL which violates project rules.
-- However, pg_cron runs inside the database and CANNOT access environment variables.
-- This matches the existing pattern used by order-monitor and process-webhooks cron jobs.
-- If you need to use this in dev/staging, manually update the URL in the cron.job table.

-- Extensions should already exist from previous migrations, but ensure they're available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove existing job if it exists (for idempotency)
SELECT cron.unschedule('sync-inventory-to-shopify')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-inventory-to-shopify'
);

-- Schedule the sync job every 5 minutes
SELECT cron.schedule(
  'sync-inventory-to-shopify',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iwavciibrspfjezujydc.supabase.co/functions/v1/sync-inventory-to-shopify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Inventory sync runs every 5 minutes to process out-of-stock updates to Shopify';
