-- 031_stage_events_preview_fix.sql
-- Preview-safe, order-proof bootstrap for public.stage_events:
-- 1) create table if missing
-- 2) add missing columns (IF NOT EXISTS) + backfill NULL/'' + enforce NOT NULL
-- 3) create the composite unique index
-- Idempotent on any environment; no mock data is inserted.

-- 1) Ensure table exists FIRST
create table if not exists public.stage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id uuid not null,
  shop_domain text not null,
  stage text not null,
  status text not null,
  task_suffix text not null
);

-- 2) Reconcile columns on older/partial tables
do $$
begin
  -- order_id
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='order_id'
  ) then
    alter table public.stage_events add column order_id uuid;
  end if;
  update public.stage_events
     set order_id = coalesce(order_id, gen_random_uuid())
   where order_id is null;
  alter table public.stage_events alter column order_id set not null;

  -- shop_domain
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='shop_domain'
  ) then
    alter table public.stage_events add column shop_domain text;
  end if;
  update public.stage_events
     set shop_domain = coalesce(nullif(shop_domain,''), 'unknown-' || id)
   where shop_domain is null or shop_domain = '';
  alter table public.stage_events alter column shop_domain set not null;

  -- stage
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='stage'
  ) then
    alter table public.stage_events add column stage text;
  end if;
  update public.stage_events
     set stage = coalesce(nullif(stage,''), 'Filling')
   where stage is null or stage = '';
  alter table public.stage_events alter column stage set not null;

  -- status
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='status'
  ) then
    alter table public.stage_events add column status text;
  end if;
  update public.stage_events
     set status = coalesce(nullif(status,''), 'pending')
   where status is null or status = '';
  alter table public.stage_events alter column status set not null;

  -- task_suffix
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='task_suffix'
  ) then
    alter table public.stage_events add column task_suffix text;
  end if;
  update public.stage_events
     set task_suffix = coalesce(nullif(task_suffix,''), 'A')
   where task_suffix is null or task_suffix = '';
  alter table public.stage_events alter column task_suffix set not null;
end$$;

-- 3) Idempotency index (runs AFTER table creation)
create unique index if not exists stage_events_order_shop_stage_suffix_uidx
  on public.stage_events(order_id, shop_domain, stage, task_suffix);

