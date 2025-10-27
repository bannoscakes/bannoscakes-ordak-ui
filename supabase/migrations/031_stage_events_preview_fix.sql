-- 031_stage_events_preview_fix.sql
-- Preview-safe, order-proof bootstrap for public.stage_events.
-- Works on a fresh DB and on DBs with older/partial shapes.

-- 1) Ensure the table exists FIRST (critical for preview)
create table if not exists public.stage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id text not null,
  shop_domain text not null,
  stage text not null,
  status text not null,
  task_suffix text not null
);

-- 2) If an older table exists with nullable/empty fields, backfill + enforce NOT NULL (idempotent)
do $$
begin
  -- order_id
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='order_id'
  ) then
    update public.stage_events
       set order_id = coalesce(nullif(order_id,''), 'unknown-' || id)
     where order_id is null or order_id = '';
    alter table public.stage_events alter column order_id set not null;
  end if;

  -- shop_domain
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='shop_domain'
  ) then
    update public.stage_events
       set shop_domain = coalesce(nullif(shop_domain,''), 'unknown-' || id)
     where shop_domain is null or shop_domain = '';
    alter table public.stage_events alter column shop_domain set not null;
  end if;

  -- stage
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='stage'
  ) then
    update public.stage_events
       set stage = coalesce(nullif(stage,''), 'Filling')
     where stage is null or stage = '';
    alter table public.stage_events alter column stage set not null;
  end if;

  -- status
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='status'
  ) then
    update public.stage_events
       set status = coalesce(nullif(status,''), 'pending')
     where status is null or status = '';
    alter table public.stage_events alter column status set not null;
  end if;

  -- task_suffix
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stage_events' and column_name='task_suffix'
  ) then
    update public.stage_events
       set task_suffix = coalesce(nullif(task_suffix,''), 'A')
     where task_suffix is null or task_suffix = '';
    alter table public.stage_events alter column task_suffix set not null;
  end if;
end$$;

-- 3) Idempotency index (runs after table creation)
create unique index if not exists stage_events_order_shop_stage_suffix_uidx
  on public.stage_events(order_id, shop_domain, stage, task_suffix);

