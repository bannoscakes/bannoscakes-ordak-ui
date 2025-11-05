-- 037_make_due_date_nullable.sql
-- Make due_date nullable to support raw order storage
-- Orders will be processed later by backend using Liquid templates

-- Create orders_bannos if it doesn't exist (based on schema-and-rls.md)
create table if not exists public.orders_bannos (
  row_id                 uuid primary key default gen_random_uuid(),
  id                     text not null unique,
  shopify_order_id       bigint,
  shopify_order_gid      text,
  shopify_order_number   int,
  customer_name          text,
  product_title          text,
  flavour                text,
  notes                  text,
  currency               char(3),
  total_amount           numeric(12,2),
  order_json             jsonb,
  stage                  text not null default 'Filling',
  priority               smallint not null default 0,
  assignee_id            uuid,
  storage                text,
  due_date               date,  -- nullable for raw order storage
  size                   text,
  filling_start_ts       timestamptz,
  filling_complete_ts    timestamptz,
  covering_complete_ts   timestamptz,
  decorating_complete_ts timestamptz,
  packing_start_ts       timestamptz,
  packing_complete_ts    timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Create orders_flourlane if it doesn't exist (same structure as bannos)
create table if not exists public.orders_flourlane (
  row_id                 uuid primary key default gen_random_uuid(),
  id                     text not null unique,
  shopify_order_id       bigint,
  shopify_order_gid      text,
  shopify_order_number   int,
  customer_name          text,
  product_title          text,
  flavour                text,
  notes                  text,
  currency               char(3),
  total_amount           numeric(12,2),
  order_json             jsonb,
  stage                  text not null default 'Filling',
  priority               smallint not null default 0,
  assignee_id            uuid,
  storage                text,
  due_date               date,  -- nullable for raw order storage
  size                   text,
  filling_start_ts       timestamptz,
  filling_complete_ts    timestamptz,
  covering_complete_ts   timestamptz,
  decorating_complete_ts timestamptz,
  packing_start_ts       timestamptz,
  packing_complete_ts    timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- If tables already exist, make due_date nullable
do $$
begin
  -- orders_bannos
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'orders_bannos' 
    and column_name = 'due_date'
    and is_nullable = 'NO'
  ) then
    alter table public.orders_bannos alter column due_date drop not null;
  end if;
  
  -- orders_flourlane
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'orders_flourlane' 
    and column_name = 'due_date'
    and is_nullable = 'NO'
  ) then
    alter table public.orders_flourlane alter column due_date drop not null;
  end if;
end $$;

-- Add comments explaining why
comment on column public.orders_bannos.due_date is 
  'Delivery/pickup date. NULL for raw orders awaiting backend processing.';

comment on column public.orders_flourlane.due_date is 
  'Delivery/pickup date. NULL for raw orders awaiting backend processing.';

