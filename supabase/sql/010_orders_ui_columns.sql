-- 010_orders_ui_columns.sql
-- Add UI/docket fields + helpful indexes. All statements idempotent.

-- A) Core display fields used by cards/docket
alter table public.orders
  add column if not exists customer_name        text,
  add column if not exists order_number         text,        -- Shopify short number (string-safe)
  add column if not exists delivery_date        date,
  add column if not exists delivery_method      text,        -- 'delivery' | 'pickup'
  add column if not exists product_title        text,
  add column if not exists flavour              text,
  add column if not exists item_qty             integer,
  add column if not exists notes                text;

-- B) Stage tracking per locked rules
alter table public.orders
  add column if not exists status_stage           text default 'Filling_pending',
  add column if not exists filling_start_ts       timestamptz,
  add column if not exists filling_complete_ts    timestamptz,
  add column if not exists covering_complete_ts   timestamptz,
  add column if not exists decorating_complete_ts timestamptz,
  add column if not exists packing_start_ts       timestamptz,
  add column if not exists packing_complete_ts    timestamptz;

-- C) List-view indexes (for Today/Week screens)
create index if not exists orders_store_delivery_idx
  on public.orders (store, delivery_date);

create index if not exists orders_stage_listing_idx
  on public.orders (status_stage, delivery_date);

-- D) Tolerant checks (can tighten later)
do $$
begin
  alter table public.orders
    add constraint orders_delivery_method_chk
    check (delivery_method is null or delivery_method in ('delivery','pickup'));
exception when duplicate_object then null;
end$$;

do $$
begin
  alter table public.orders
    add constraint orders_status_stage_chk
    check (status_stage in (
      'Filling_pending','Filling_in_progress',
      'Covering_pending','Covering_in_progress',
      'Decorating_pending','Decorating_in_progress',
      'Packing_in_progress','Complete'
    ));
exception when duplicate_object then null;
end$$;
