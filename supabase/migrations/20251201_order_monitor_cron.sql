-- Order monitoring cron job - runs every 30 minutes
-- Checks if no orders processed in last 2 hours and sends email alert

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
        WHERE name = 'anon_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Order monitor runs every 30 minutes to check for stalled order processing';
