-- 031_stage_events_preview_fix.sql
-- Preview-safe bootstrap so Supabase Preview never tries to index a missing table.

-- Ensure table exists (full shape) - safe on fresh or existing DBs
create table if not exists public.stage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id text not null,
  shop_domain text not null,
  stage text not null,
  status text not null,
  task_suffix text not null
);

-- Ensure composite unique index exists (idempotent)
create unique index if not exists stage_events_order_shop_stage_suffix_uidx
  on public.stage_events(order_id, shop_domain, stage, task_suffix);

