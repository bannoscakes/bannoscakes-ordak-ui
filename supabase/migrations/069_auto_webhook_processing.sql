-- Migration: Auto Webhook Processing
-- Enable automatic processing of webhooks from inbox tables every 5 minutes
-- Uses pg_cron to call the process-inbox Edge Function

-- Enable pg_cron extension if not already enabled
create extension if not exists pg_cron;

-- Grant necessary permissions to postgres role
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Create cron job to process Bannos webhooks every 5 minutes
select cron.schedule(
  'process-webhooks-bannos',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  select
    net.http_post(
      url := 'https://iwavciibrspfjezujydc.supabase.co/functions/v1/process-inbox',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YXZjaWlicnNwZmplenVqeWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMTQ4MzYsImV4cCI6MjA0MzY5MDgzNn0.dFuYkpzECxA_RA6hK5GFEEkX5bDnzUJMu1D1cB_Q2Po'
      ),
      body := jsonb_build_object(
        'store', 'bannos',
        'limit', 50
      )
    ) as request_id;
  $$
);

-- Create cron job to process Flourlane webhooks every 5 minutes (offset by 2.5 minutes)
select cron.schedule(
  'process-webhooks-flourlane',
  '2-59/5 * * * *',  -- Every 5 minutes, offset by 2 minutes
  $$
  select
    net.http_post(
      url := 'https://iwavciibrspfjezujydc.supabase.co/functions/v1/process-inbox',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YXZjaWlicnNwZmplenVqeWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMTQ4MzYsImV4cCI6MjA0MzY5MDgzNn0.dFuYkpzECxA_RA6hK5GFEEkX5bDnzUJMu1D1cB_Q2Po'
      ),
      body := jsonb_build_object(
        'store', 'flourlane',
        'limit', 50
      )
    ) as request_id;
  $$
);

-- View scheduled cron jobs
comment on extension pg_cron is 'Automatic webhook processing enabled';

-- Instructions to view cron jobs:
-- SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('process-webhooks-bannos');
