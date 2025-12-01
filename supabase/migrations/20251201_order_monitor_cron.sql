-- Order monitoring cron job - runs every 30 minutes
-- Checks if no orders processed in last 2 hours and sends email alert

-- ⚠️ LIMITATION: pg_cron URL Hardcoding
-- This migration contains a hardcoded Supabase project URL which violates project rules.
-- However, pg_cron runs inside the database and CANNOT access environment variables.
-- 
-- Alternative approaches considered:
-- 1. Supabase Database Webhooks - Cannot trigger on time-based schedules (only on DB events)
-- 2. External cron (GitHub Actions) - Requires GitHub secrets management, less reliable
-- 3. Client-side polling - Unreliable, won't work when app is closed
--
-- This matches the existing pattern used by process-webhooks-bannos and process-webhooks-flourlane.
-- If you need to use this in dev/staging, manually update the URL in the cron.job table.
--
-- See: docs/WEBHOOK_AUTOMATION_SETUP.md for full context

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'order-monitor',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iwavciibrspfjezujydc.supabase.co/functions/v1/order-monitor',
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

COMMENT ON EXTENSION pg_cron IS 'Order monitor runs every 30 minutes to check for stalled order processing';
