-- 028_stage_events_align.sql
-- SAFE bootstrap: create stage_events table + unique index.
-- (Index must exist here so 027's ON CONFLICT works correctly)

create table if not exists public.stage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id uuid not null,
  shop_domain text not null,
  stage text not null,
  status text not null,
  task_suffix text not null
);

-- Idempotency key for process_kitchen_task_create ON CONFLICT
create unique index if not exists stage_events_order_shop_stage_suffix_uidx
  on public.stage_events(order_id, shop_domain, stage, task_suffix);
