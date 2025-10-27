-- 028_stage_events_align.sql
-- SAFE bootstrap only: create stage_events if it doesn't exist.
-- No column alters and NO indexes here. 029 will reconcile/ backfill/ index.

create table if not exists public.stage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id text not null,
  shop_domain text not null,
  stage text not null,
  status text not null,
  task_suffix text not null
);
