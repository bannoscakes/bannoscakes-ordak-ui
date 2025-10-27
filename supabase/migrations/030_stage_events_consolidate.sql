-- 030_stage_events_consolidate.sql
-- One-shot, order-proof alignment for public.stage_events.
-- Safe on fresh DBs and on existing DBs with partial/older shapes.

-- A) Ensure table exists (full shape for fresh DBs)
create table if not exists public.stage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id text not null,
  shop_domain text not null,
  stage text not null,
  status text not null,
  task_suffix text not null
);

-- B) If table existed but columns differ, add/backfill/enforce NOT NULL (idempotent)
do $$
begin
  -- order_id
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='order_id'
  ) then
    alter table public.stage_events add column order_id text;
  end if;
  update public.stage_events
     set order_id = coalesce(nullif(order_id,''), 'unknown-' || id)
   where order_id is null or order_id = '';
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

-- C) Idempotency index (safe to run many times)
create unique index if not exists stage_events_order_shop_stage_suffix_uidx
  on public.stage_events(order_id, shop_domain, stage, task_suffix);

