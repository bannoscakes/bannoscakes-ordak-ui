-- 028_stage_events_align.sql
-- Make stage_events compatible with stage-ticket worker:
-- ensures columns (order_id, shop_domain, stage, status, task_suffix)
-- and adds idempotency index on (order_id, shop_domain, stage, task_suffix).

-- If table doesn't exist, create minimal shape
create table if not exists public.stage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id text not null,
  shop_domain text not null,
  stage text not null,
  status text not null,
  task_suffix text not null
);

-- If table exists but columns are missing, add them defensively
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='order_id'
  ) then
    alter table public.stage_events add column order_id text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='shop_domain'
  ) then
    alter table public.stage_events add column shop_domain text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='stage'
  ) then
    alter table public.stage_events add column stage text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='status'
  ) then
    alter table public.stage_events add column status text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='task_suffix'
  ) then
    alter table public.stage_events add column task_suffix text;
  end if;
end$$;

-- Idempotency: one ticket per (order, shop, stage, suffix)
create unique index if not exists stage_events_order_shop_stage_suffix_uidx
  on public.stage_events(order_id, shop_domain, stage, task_suffix);

