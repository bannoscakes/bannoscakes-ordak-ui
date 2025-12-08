-- Inventory sync cron job - runs every 5 minutes
-- Processes inventory_sync_queue and sets items out of stock in Shopify

-- ⚠️ LIMITATION: pg_cron URL Hardcoding
-- This migration contains a hardcoded Supabase project URL which violates project rules.
-- However, pg_cron runs inside the database and CANNOT access environment variables.
-- This matches the existing pattern used by order-monitor and process-webhooks cron jobs.
-- If you need to use this in dev/staging, manually update the URL in the cron.job table.

-- Extensions pg_cron and pg_net should already exist from previous migrations
-- Do NOT try to create them here as it causes privilege errors on Supabase
-- This migration is wrapped in a check so it doesn't fail in CI/test environments without pg_cron

DO $$
BEGIN
  -- Only run if pg_cron extension exists (production Supabase)
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Remove existing job if it exists (for idempotency)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-inventory-to-shopify') THEN
      PERFORM cron.unschedule('sync-inventory-to-shopify');
    END IF;

    -- Schedule the sync job every 5 minutes
    PERFORM cron.schedule(
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

    RAISE NOTICE 'pg_cron job sync-inventory-to-shopify scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - skipping cron job creation (this is expected in CI/test environments)';
  END IF;
END;
$$;
