-- 001_orders_core.sql
-- Correct database schema that matches webhook-ingest.md and UI expectations

-- Prerequisites
create extension if not exists pgcrypto;

-- Correct stage enum (matches webhook-ingest.md and UI expectations)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stage_type') then
    create type stage_type as enum ('Filling','Covering','Decorating','Packing','Complete');
  end if;
end$$;

-- Staff table (shared between stores)
create table if not exists public.staff_shared (
  row_id       uuid primary key default gen_random_uuid(),
  user_id      uuid unique,                 -- supabase auth id
  full_name    text,
  role         text check (role in ('Admin','Supervisor','Staff')) default 'Staff',
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- Orders table for Bannos (matches webhook-ingest.md exactly)
create table if not exists public.orders_bannos (
  row_id                 uuid primary key default gen_random_uuid(),
  id                     text not null unique,          -- human_id: "bannos-12345"
  shopify_order_id       bigint,                        -- numeric ID
  shopify_order_gid      text,                          -- GraphQL ID (for dedupe)
  shopify_order_number   int,                           -- order number
  customer_name          text,                          -- customer name
  product_title          text,                          -- primary line item title
  flavour                text,                          -- extracted flavours
  notes                  text,                          -- notes + delivery instructions
  currency               char(3),                       -- currency code
  total_amount           numeric(12,2),                 -- total amount
  order_json             jsonb,                         -- full payload
  stage                  stage_type not null default 'Filling', -- current stage
  priority               smallint not null default 0,   -- derived from due_date
  assignee_id            uuid references public.staff_shared(user_id) on delete set null,
  storage                text,                          -- storage location
  due_date               date not null,                 -- due date
  delivery_method        text,                          -- pickup/delivery
  size                   text,                          -- S/M/L (from UI)
  item_qty               integer,                       -- quantity (from UI)
  
  -- timestamps (matches schema-and-rls.md)
  filling_start_ts       timestamptz,
  filling_complete_ts    timestamptz,
  covering_complete_ts   timestamptz,
  decorating_complete_ts timestamptz,
  packing_start_ts       timestamptz,
  packing_complete_ts    timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Orders table for Flourlane (identical structure)
create table if not exists public.orders_flourlane (like public.orders_bannos including all);

-- Updated-at triggers
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_orders_bannos_updated on public.orders_bannos;
create trigger trg_orders_bannos_updated
before update on public.orders_bannos
for each row execute function set_updated_at();

drop trigger if exists trg_orders_flourlane_updated on public.orders_flourlane;
create trigger trg_orders_flourlane_updated
before update on public.orders_flourlane
for each row execute function set_updated_at();

-- Performance indexes (matches schema-and-rls.md)
-- Queue ordering (incomplete only)
create index if not exists idx_orders_bannos_queue
  on public.orders_bannos (priority desc, due_date asc, size asc, shopify_order_number asc)
  where stage <> 'Complete';

create index if not exists idx_orders_flourlane_queue
  on public.orders_flourlane (priority desc, due_date asc, size asc, shopify_order_number asc)
  where stage <> 'Complete';

-- Unassigned counts/lists
create index if not exists idx_orders_bannos_unassigned
  on public.orders_bannos (stage, priority, shopify_order_number)
  where assignee_id is null and stage <> 'Complete';

create index if not exists idx_orders_flourlane_unassigned
  on public.orders_flourlane (stage, priority, shopify_order_number)
  where assignee_id is null and stage <> 'Complete';

-- Shopify webhook dedupe (GID present)
create index if not exists idx_orders_bannos_shopify_gid
  on public.orders_bannos (shopify_order_gid)
  where shopify_order_gid is not null;

create index if not exists idx_orders_flourlane_shopify_gid
  on public.orders_flourlane (shopify_order_gid)
  where shopify_order_gid is not null;

-- Date-range queries (exclude completed)
create index if not exists idx_orders_bannos_due_date
  on public.orders_bannos (due_date, stage)
  where stage <> 'Complete';

create index if not exists idx_orders_flourlane_due_date
  on public.orders_flourlane (due_date, stage)
  where stage <> 'Complete';
